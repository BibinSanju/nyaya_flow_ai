"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Plus, Mic, Square, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { apiSuggestBns, apiTranscribeAudio } from "@/utils/api";
import DocumentUpload from "@/components/document-upload";
import AppHeader from "@/components/ui/app-header";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { getStoredUser, type StoredUser } from "@/lib/session";

interface FirRecord {
  id: string;
  station: string;
  complainant: string;
  crimeType: string;
  date: string;
  description: string;
  mappedBns: string[];
  status: string;
}

export default function PolicePortal() {
  const [activeTab, setActiveTab] = useState<"fir-list" | "new-fir">("fir-list");
  const [selectedFirId, setSelectedFirId] = useState<string | null>(null);
  const [incidentText, setIncidentText] = useState("");
  const [analyzingBns, setAnalyzingBns] = useState(false);
  const [bnsSuggestions, setBnsSuggestions] = useState<any[]>([]);
  const [selectedBns, setSelectedBns] = useState<string[]>([]);
  const [officerConfirmed, setOfficerConfirmed] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [incidentValidationError, setIncidentValidationError] = useState<string | null>(null);

  // Voice Recording & Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [sttFeedback, setSttFeedback] = useState<string | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const stopRecordingSession = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping media recorder:", e);
      }
    }
    setIsRecording(false);
  };

  const handleVoiceInput = async () => {
    setSttError(null);
    setSttFeedback(null);

    if (isRecording) {
      stopRecordingSession();
      return;
    }

    try {
      if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone input is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      liveTranscriptRef.current = "";
      setLiveTranscript("");

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const actualType = mediaRecorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        audioChunksRef.current = [];

        const liveCaptured = liveTranscriptRef.current?.trim();

        if (audioBlob.size < 500 && !liveCaptured) {
          setSttFeedback("Recording too brief. Please speak clearly into your microphone.");
          setIsTranscribing(false);
          return;
        }

        setIsTranscribing(true);
        setSttFeedback("Transcribing…");

        try {
          const res = await apiTranscribeAudio(audioBlob, "auto");
          if (res?.text && res.text.trim()) {
            const transcribed = res.text.trim();
            setIncidentText((prev) => (prev.trim() ? `${prev.trim()}\n\n${transcribed}` : transcribed));
            setSttFeedback(`✓ Transcribed ${res.duration ? `${Math.round(res.duration)}s ` : ""}statement (${res.language || 'detected'})`);
            setTimeout(() => setSttFeedback(null), 6000);
          } else if (liveCaptured) {
            setIncidentText((prev) => (prev.trim() ? `${prev.trim()}\n\n${liveCaptured}` : liveCaptured));
            setSttFeedback("✓ Captured statement via Speech Engine");
            setTimeout(() => setSttFeedback(null), 6000);
          } else {
            setSttFeedback("No audible speech detected. Please check microphone volume and try again.");
          }
        } catch (transcribeErr: any) {
          console.warn("Groq STT transcription warning:", transcribeErr);
          if (liveCaptured) {
            setIncidentText((prev) => (prev.trim() ? `${prev.trim()}\n\n${liveCaptured}` : liveCaptured));
            setSttFeedback("✓ Recorded statement via Speech Engine");
            setTimeout(() => setSttFeedback(null), 6000);
          } else {
            setSttError(
              transcribeErr?.message || "Could not transcribe audio statement."
            );
          }
        } finally {
          setIsTranscribing(false);
          setLiveTranscript("");
          liveTranscriptRef.current = "";
        }
      };

      // Start in-browser Web Speech API for real-time live captions & fallback
      if (typeof window !== "undefined") {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const rec = new SpeechRec();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = "en-IN";
            rec.onresult = (evt: any) => {
              let currentText = "";
              for (let i = 0; i < evt.results.length; ++i) {
                currentText += evt.results[i][0].transcript;
              }
              if (currentText) {
                setLiveTranscript(currentText);
                liveTranscriptRef.current = currentText;
              }
            };
            rec.onerror = () => {};
            rec.start();
            recognitionRef.current = rec;
          } catch (recErr) {
            console.warn("Live speech recognition initialization:", recErr);
          }
        }
      }

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecordingSession();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn("Mic access error:", err);
      setIsRecording(false);
      setIsTranscribing(false);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setSttError("Microphone permission was denied. Please allow microphone access in your browser address bar.");
      } else {
        setSttError(err?.message || "Failed to initialize microphone.");
      }
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    try {
      const saved = localStorage.getItem(FIR_STORAGE_KEY);
      if (saved) {
        const parsed: FirRecord[] = JSON.parse(saved);
        setFirs(parsed);
        setSelectedFirId(parsed[0]?.id ?? null);
      }
    } catch {}
  }, []);

  const [firs, setFirs] = useState<FirRecord[]>([]);
  const [complainant, setComplainant] = useState("");
  const [station, setStation] = useState("");

  const selectedFir = firs.find((f) => f.id === selectedFirId) || null;

  const handleAnalyzeBns = async () => {
    setIncidentValidationError(null);
    const text = incidentText.trim();
    if (!text) {
      setIncidentValidationError("Describe the incident first.");
      return;
    }

    const trivialGreetingRegex = /^(hi|hello|hey|namaste|vanakkam|good\s+(morning|afternoon|evening|day)|how\s+are\s+you|testing|test(\s+123)?|what\s+is\s+up|sup)[\s.!?,]*$/i;
    if (trivialGreetingRegex.test(text) || text.length < 12) {
      setIncidentValidationError("This doesn't look like an incident report. Describe what happened, where and when.");
      return;
    }

    setAnalyzingBns(true);
    try {
      const res = await apiSuggestBns(text);
      if (res.success && res.suggestions) {
        setBnsSuggestions(res.suggestions);
        setSelectedBns([]);
      } else {
        setIncidentValidationError(res.error || "Could not analyse the incident.");
      }
    } catch (err: any) {
      setIncidentValidationError(err?.message || "Could not analyse the incident.");
    } finally {
      setAnalyzingBns(false);
    }
  };

  const toggleBns = (sec: string) => {
    setSelectedBns((prev) => (prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]));
  };

  const handleRegisterFir = () => {
    const newFir: FirRecord = {
      id: `FIR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      station: station.trim() || "Not specified",
      complainant: complainant.trim() || "Not specified",
      crimeType: bnsSuggestions.find((s) => s.section === selectedBns[0])?.title || selectedBns[0] || "Cognizable offence",
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      description: incidentText,
      mappedBns: selectedBns,
      status: "Registered",
    };

    const next = [newFir, ...firs];
    setFirs(next);
    try {
      localStorage.setItem(FIR_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setSelectedFirId(newFir.id);
    setActiveTab("fir-list");
    setIncidentText("");
    setComplainant("");
    setStation("");
    setBnsSuggestions([]);
    setSelectedBns([]);
    setOfficerConfirmed(false);
  };

  const officerName = currentUser?.fullName
    ? /officer|inspector|si |asi /i.test(currentUser.fullName) ? currentUser.fullName : `Officer ${currentUser.fullName}`
    : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader workspace="Police" userName={officerName} userDetail={currentUser?.email} />

      <main className="container-page py-6 sm:py-8 flex-1 w-full space-y-6">
        <PageHeader
          title={activeTab === "fir-list" ? "FIR register" : "New FIR"}
          description={
            activeTab === "fir-list"
              ? "FIRs you've registered and their BNS sections."
              : "Record the complainant's statement. You'll get suggested BNS sections to confirm."
          }
          actions={
            activeTab === "fir-list" ? (
              <button type="button" onClick={() => setActiveTab("new-fir")} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                New FIR
              </button>
            ) : (
              <button type="button" onClick={() => setActiveTab("fir-list")} className="btn btn-secondary">
                Back to register
              </button>
            )
          }
        />

        {activeTab === "fir-list" && (
          <>
            <div className="callout callout-info">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>FIRs are currently saved in this browser only. They are not yet synced to the court database.</span>
            </div>

            {firs.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={FileText}
                  title="No FIRs yet"
                  description="Register an FIR to see it here."
                  action={
                    <button type="button" onClick={() => setActiveTab("new-fir")} className="btn btn-primary btn-sm">
                      New FIR
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <section className="card overflow-hidden self-start">
                  <div className="card-header">
                    <h2 className="card-title">FIRs</h2>
                    <span className="text-sm text-muted">{firs.length}</span>
                  </div>
                  <ul className="divide-y divide-line max-h-[640px] overflow-y-auto">
                    {firs.map((fir) => {
                      const active = fir.id === selectedFirId;
                      return (
                        <li key={fir.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedFirId(fir.id)}
                            aria-current={active ? "true" : undefined}
                            className={`w-full text-left px-5 py-3 cursor-pointer border-l-2 ${
                              active ? "bg-brand-soft border-brand" : "border-transparent hover:bg-subtle"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs text-muted">{fir.id}</span>
                              <span className="text-xs text-muted">{fir.date}</span>
                            </div>
                            <p className="text-sm font-medium text-ink truncate mt-0.5">{fir.crimeType}</p>
                            <p className="text-sm text-muted truncate">{fir.station}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {selectedFir && (
                  <section className="card">
                    <div className="card-body border-b border-line flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="kbd-code">{selectedFir.id}</span>
                        <h2 className="mt-2 text-lg font-semibold text-ink">{selectedFir.crimeType}</h2>
                        <p className="text-sm text-muted mt-0.5">
                          {selectedFir.station} · Complainant: {selectedFir.complainant}
                        </p>
                      </div>
                      <span className="badge badge-brand shrink-0">{selectedFir.status}</span>
                    </div>
                    <div className="card-body space-y-6">
                      <section>
                        <h3 className="text-sm font-semibold text-ink mb-2">Statement</h3>
                        <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{selectedFir.description}</p>
                      </section>
                      <section>
                        <h3 className="text-sm font-semibold text-ink mb-2">BNS sections</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedFir.mappedBns.map((sec) => (
                            <span key={sec} className="badge">{sec}</span>
                          ))}
                        </div>
                      </section>
                      <section>
                        <h3 className="text-sm font-semibold text-ink mb-1">Evidence</h3>
                        <p className="text-sm text-muted mb-3">Seizure memos, photos, forensic reports.</p>
                        <DocumentUpload petitionId={selectedFir.id} label="Upload evidence" />
                      </section>
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "new-fir" && (
          <div className="card max-w-3xl">
            <div className="card-body space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="complainant" className="label">Complainant</label>
                  <input id="complainant" value={complainant} onChange={(e) => setComplainant(e.target.value)} className="input" />
                </div>
                <div>
                  <label htmlFor="station" className="label">Police station</label>
                  <input id="station" value={station} onChange={(e) => setStation(e.target.value)} className="input" placeholder="e.g. Kothrud PS, Pune" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label htmlFor="incident" className="label mb-0">What happened?</label>
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    disabled={isTranscribing}
                    className={`btn btn-sm ${isRecording ? "border border-danger text-danger bg-danger-soft" : "btn-secondary"}`}
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Transcribing…
                      </>
                    ) : isRecording ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        Stop · {formatSeconds(recordingSeconds)}
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        Dictate
                      </>
                    )}
                  </button>
                </div>

                {isRecording && (
                  <div className="callout callout-error mb-2">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-danger animate-pulse shrink-0" />
                    <div className="flex-1">
                      <p>Listening… Recording stops after 60 seconds.</p>
                      {liveTranscript && <p className="mt-1 italic text-ink-2">“{liveTranscript}”</p>}
                    </div>
                  </div>
                )}
                {sttFeedback && (
                  <div className="callout mb-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{sttFeedback}</span>
                  </div>
                )}
                {sttError && (
                  <div className="callout callout-error mb-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="flex-1">{sttError}</span>
                    <button type="button" onClick={() => setSttError(null)} aria-label="Dismiss" className="cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <textarea
                  id="incident"
                  rows={6}
                  value={incidentText}
                  onChange={(e) => {
                    setIncidentText(e.target.value);
                    if (incidentValidationError) setIncidentValidationError(null);
                  }}
                  placeholder="Example: Around 11 PM on 20 Oct, the accused broke the padlock of the complainant's shop and took cash from the counter."
                  className={`input ${incidentValidationError ? "border-danger" : ""}`}
                  aria-invalid={!!incidentValidationError}
                />
                {incidentValidationError && (
                  <div className="callout callout-error mt-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{incidentValidationError}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyzeBns}
                  disabled={analyzingBns || !incidentText.trim()}
                  className="btn btn-secondary"
                >
                  {analyzingBns && <Loader2 className="w-4 h-4 animate-spin" />}
                  {analyzingBns ? "Finding sections…" : "Suggest BNS sections"}
                </button>
              </div>

              {bnsSuggestions.length > 0 && (
                <>
                  <div className="divider" />
                  <fieldset>
                    <legend className="text-sm font-semibold text-ink mb-1">Suggested sections</legend>
                    <p className="text-sm text-muted mb-3">Select the sections that apply to the facts.</p>
                    <div className="space-y-2">
                      {bnsSuggestions.map((s, idx) => {
                        const checked = selectedBns.includes(s.section);
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer ${
                              checked ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleBns(s.section)}
                              className="mt-1 accent-[var(--color-brand)]"
                            />
                            <span className="flex-1 min-w-0 text-sm">
                              <span className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium text-ink">
                                  {s.section} — {s.title}
                                </span>
                                {s.confidence && <span className="text-xs text-muted">{s.confidence} match</span>}
                              </span>
                              <span className="block mt-1 text-ink-2">{s.description}</span>
                              {s.penalty && <span className="block mt-1 text-xs text-muted">Punishment: {s.penalty}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className="flex items-start gap-2.5 text-sm text-ink-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={officerConfirmed}
                      onChange={(e) => setOfficerConfirmed(e.target.checked)}
                      className="mt-1 accent-[var(--color-brand)]"
                    />
                    I have verified the facts and confirm these sections apply.
                  </label>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRegisterFir}
                      disabled={!officerConfirmed || selectedBns.length === 0}
                      className="btn btn-primary"
                    >
                      Register FIR
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const FIR_STORAGE_KEY = "nyayaflow_police_firs";
