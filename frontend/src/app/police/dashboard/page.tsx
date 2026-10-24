"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  FileText,
  Search,
  CheckCircle,
  ArrowRight,
  LogOut,
  Scale,
  RefreshCw,
  Plus,
  Upload,
  Mic,
  Square,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { apiSuggestBns, apiTranscribeAudio } from "@/utils/api";
import DocumentUpload from "@/components/document-upload";

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
  const [selectedFirId, setSelectedFirId] = useState("FIR-1021-PUN");
  const [incidentText, setIncidentText] = useState("");
  const [analyzingBns, setAnalyzingBns] = useState(false);
  const [bnsSuggestions, setBnsSuggestions] = useState<any[]>([]);
  const [selectedBns, setSelectedBns] = useState<string[]>([]);
  const [officerConfirmed, setOfficerConfirmed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ fullName?: string; email?: string } | null>(null);
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
        setSttFeedback("Transcribing oral statement with Groq Whisper AI...");

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
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const [firs, setFirs] = useState<FirRecord[]>([
    {
      id: "FIR-1021-PUN",
      station: "Kothrud Police Station, Pune",
      complainant: "Sanjay Deshmukh",
      crimeType: "House Break-in & Theft",
      date: "Oct 20, 2026",
      description:
        "Front door lock was forcibly broken during the night. Gold ornaments and cash stolen. Window grilles found tampered.",
      mappedBns: ["Section 305 BNS (Theft in dwelling)", "Section 331(3) BNS (House-breaking)"],
      status: "Chargesheet Under Preparation",
    },
    {
      id: "FIR-1092-PUN",
      station: "Shivajinagar Police Station, Pune",
      complainant: "Nikhil Joshi",
      crimeType: "Cyber Financial Fraud",
      date: "Oct 18, 2026",
      description:
        "Phishing incident involving cloned payment links. Complainant lost Rs. 1,50,000 via spoofed UPI request.",
      mappedBns: ["Section 318 BNS (Cheating)", "Section 66D IT Act"],
      status: "Forwarded to Cyber Forensic Lab",
    },
  ]);

  const selectedFir = firs.find((f) => f.id === selectedFirId) || firs[0];

  const handleAnalyzeBns = async () => {
    setIncidentValidationError(null);
    const text = incidentText.trim();
    if (!text) {
      setIncidentValidationError("Please enter an incident narrative to analyze.");
      return;
    }

    const trivialGreetingRegex = /^(hi|hello|hey|namaste|vanakkam|good\s+(morning|afternoon|evening|day)|how\s+are\s+you|testing|test(\s+123)?|what\s+is\s+up|sup)[\s.!?,]*$/i;
    if (trivialGreetingRegex.test(text) || text.length < 12) {
      setIncidentValidationError(
        `"${text}" is not recognized as a cognizable offense or incident report. Casual greetings cannot be mapped to Bharatiya Nyaya Sanhita (BNS) penal sections. Please enter details of the reported incident.`
      );
      return;
    }

    setAnalyzingBns(true);
    try {
      const res = await apiSuggestBns(text);
      if (res.success && res.suggestions) {
        setBnsSuggestions(res.suggestions);
        setIncidentValidationError(null);
      } else {
        setIncidentValidationError(res.error || "Could not analyze incident narrative.");
      }
    } catch (err: any) {
      console.error(err);
      setIncidentValidationError(err?.message || "Invalid incident narrative. Please provide incident details.");
    } finally {
      setAnalyzingBns(false);
    }
  };

  const toggleBns = (sec: string) => {
    setSelectedBns((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  const handleRegisterFir = () => {
    const newFir: FirRecord = {
      id: "FIR-" + Math.floor(2000 + Math.random() * 8000) + "-PUN",
      station: "Kothrud Police Station, Pune",
      complainant: "Anonymous / State Witness",
      crimeType: selectedBns[0] || "Cognizable Offense",
      date: new Date().toLocaleDateString(),
      description: incidentText,
      mappedBns: selectedBns.length > 0 ? selectedBns : ["Section 305 BNS"],
      status: "FIR Registered (Official)",
    };

    setFirs([newFir, ...firs]);
    setSelectedFirId(newFir.id);
    setActiveTab("fir-list");
    setIncidentText("");
    setBnsSuggestions([]);
    setSelectedBns([]);
    setOfficerConfirmed(false);
  };

  const handleOpenChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-nyayaflow-chat"));
    }
  };

  return (
    <div className="min-h-screen text-stone-200 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-[#2d2621] sticky top-0 bg-[#12100e]/95 backdrop-blur-md z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded border border-[#3e352f] bg-[#221c18] text-stone-200 flex items-center justify-center font-semibold">
                <Shield className="w-4 h-4 text-stone-300" />
              </div>
              <span className="font-semibold text-base text-stone-100 tracking-tight">NyayaFlow</span>
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-xs font-medium text-stone-400 hidden sm:inline">Investigating Agency Portal</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Direct AI Chat Launcher */}
            <button
              onClick={handleOpenChat}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[#38302a] bg-[#1c1714] text-stone-300 hover:bg-[#25201b] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Court Assistant</span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-stone-200">
                {currentUser?.fullName
                  ? (currentUser.fullName.toLowerCase().includes("officer") || currentUser.fullName.toLowerCase().includes("inspector") ? currentUser.fullName : `Officer ${currentUser.fullName}`)
                  : "Inspector R. Sharma"}
              </p>
              <p className="text-[11px] text-stone-400 font-mono">{currentUser?.email || "IPS-89210-DL"}</p>
            </div>
            <Link
              href="/auth"
              className="p-2 text-stone-400 hover:text-stone-200 rounded border border-[#2d2621] hover:border-[#443a33] bg-[#181513] transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#3e352f] bg-[#201b17] text-[11px] font-medium text-stone-300 mb-2">
              <Shield className="w-3 h-3 text-stone-400" />
              <span>BNS Cross-Reference & Evidence Log</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-100 tracking-tight">First Information Report (FIR) Ledger</h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              Input incident narratives, verify Bharatiya Nyaya Sanhita (BNS) statutory sections, and record evidence hashes.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("fir-list")}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "fir-list"
                  ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]"
                  : "border border-[#2d2621] bg-[#14110f] hover:bg-[#1e1916] text-stone-400"
              }`}
            >
              Registered FIRs
            </button>
            <button
              onClick={() => setActiveTab("new-fir")}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "new-fir"
                  ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]"
                  : "border border-[#2d2621] bg-[#14110f] hover:bg-[#1e1916] text-stone-400"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Incident</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FIR LIST */}
        {activeTab === "fir-list" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="border border-[#2e2722] rounded-xl p-5 bg-[#181513]/95 backdrop-blur-md space-y-3 shadow-xl shadow-black/40">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Active FIR Dossiers ({firs.length})
              </h2>

              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {firs.map((fir) => {
                  const isSelected = fir.id === selectedFir.id;
                  return (
                    <button
                      key={fir.id}
                      onClick={() => setSelectedFirId(fir.id)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "border-[#6e5f54] bg-[#26201c] text-stone-100 font-semibold ring-1 ring-[#6e5f54]/40"
                          : "border-[#2d2621] hover:border-[#443a33] bg-[#14110f] text-stone-300 hover:text-stone-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-200">{fir.id}</span>
                        <span className="text-[11px] text-stone-500">{fir.date}</span>
                      </div>
                      <p className="text-stone-300 mt-1 line-clamp-1">{fir.crimeType}</p>
                      <p className="text-[11px] text-stone-500 mt-1">{fir.station}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
              <div className="flex items-start justify-between border-b border-[#2d2621] pb-4">
                <div>
                  <span className="text-[11px] font-mono text-stone-400 bg-[#1c1815] border border-[#2d2621] px-2 py-0.5 rounded">
                    {selectedFir.id}
                  </span>
                  <h2 className="text-base font-bold text-stone-100 mt-2">{selectedFir.crimeType}</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Station: {selectedFir.station}</p>
                </div>

                <span className="px-2.5 py-1 rounded text-xs font-medium bg-[#201b17] text-stone-300 border border-[#38302a]">
                  {selectedFir.status}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Incident Narrative
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 bg-[#12100e] p-4 rounded-lg border border-[#2d2621] leading-relaxed">
                  {selectedFir.description}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Applied Bharatiya Nyaya Sanhita (BNS) Provisions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedFir.mappedBns.map((sec, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-[#201b17] border border-[#38302a] text-xs font-mono text-stone-300"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Attach Forensic Evidence */}
              <div className="pt-4 border-t border-[#2d2621] space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Attach Forensic Evidence & Scanned Chargesheet
                </h3>
                <DocumentUpload
                  petitionId={selectedFir.id}
                  userId="investigating_officer_sharma"
                  label="Upload Crime Scene Photos, Forensic PDF, or Seizure Memo"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NEW INCIDENT ENTRY */}
        {activeTab === "new-fir" && (
          <div className="max-w-2xl mx-auto border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
            <div>
              <h2 className="text-base font-bold text-stone-100">New Incident Entry & BNS Cross-Referencer</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Input the complainant narrative. The system will recommend applicable statutory penal provisions for officer confirmation.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-stone-300">Incident Narrative</label>
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={isTranscribing}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors ${
                    isRecording
                      ? "bg-rose-950/60 text-rose-200 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.2)] hover:bg-rose-900/70 cursor-pointer"
                      : isTranscribing
                      ? "bg-stone-900 text-stone-400 border border-[#3e352f] cursor-wait"
                      : "bg-[#1c1815] text-stone-300 hover:text-stone-100 hover:bg-[#25201c] border border-[#3e352f] cursor-pointer"
                  }`}
                  title={
                    isRecording
                      ? "Click to stop recording and transcribe"
                      : "Click to dictate statement via Groq Whisper AI"
                  }
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Transcribing statement...</span>
                    </>
                  ) : isRecording ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <Square className="w-3 h-3 text-rose-300 fill-rose-300 ml-0.5" />
                      <span className="font-mono text-rose-200 font-semibold">
                        Stop ({formatSeconds(recordingSeconds)})
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-amber-500" />
                      <span>Dictate Statement (Hindi / Marathi / English)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Active Recording Notice */}
              {isRecording && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-950/30 border border-rose-500/40 rounded text-xs text-rose-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span>Listening... Dictate complainant or officer oral statement. Click <strong>Stop ({formatSeconds(recordingSeconds)})</strong> when done.</span>
                    <span className="ml-auto font-mono text-[11px] text-rose-400">Max 60s</span>
                  </div>
                  {liveTranscript && (
                    <div className="px-3 py-1.5 bg-[#1b1714] border border-amber-500/30 rounded text-xs text-stone-200">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 block mb-0.5">Live Captions:</span>
                      <p className="italic text-stone-300 font-serif">"{liveTranscript}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Toast */}
              {sttFeedback && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-emerald-500/30 rounded text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{sttFeedback}</span>
                </div>
              )}

              {/* Error Banner */}
              {sttError && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-950/40 border border-rose-500/40 rounded text-xs text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{sttError}</span>
                  <button
                    type="button"
                    onClick={() => setSttError(null)}
                    className="text-stone-400 hover:text-stone-200 text-xs px-1"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <textarea
                rows={5}
                value={incidentText}
                onChange={(e) => {
                  setIncidentText(e.target.value);
                  if (incidentValidationError) setIncidentValidationError(null);
                }}
                placeholder="e.g. Accused broke the padlock of complainant's shop after 11 PM and stole cash register contents..."
                className={`bw-input leading-relaxed ${
                  incidentValidationError ? "border-rose-500/70 focus:border-rose-400 bg-rose-950/10" : ""
                }`}
              />

              {incidentValidationError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-200 text-xs leading-relaxed animate-in fade-in duration-200 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-rose-300">Invalid Incident Narrative (Ignored)</p>
                    <p>{incidentValidationError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAnalyzeBns}
                disabled={analyzingBns || !incidentText.trim()}
                className="bw-btn-primary px-4 py-2 text-xs font-semibold"
              >
                {analyzingBns ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing BNS Sections...</span>
                  </>
                ) : (
                  <>
                    <span>Recommend BNS Sections</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Suggestions */}
            {bnsSuggestions.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#2d2621]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Select Applicable Sections (Officer Confirmation Required)
                </h3>

                <div className="space-y-2">
                  {bnsSuggestions.map((s, idx) => {
                    const isChecked = selectedBns.includes(s.section);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleBns(s.section)}
                        className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "border-[#6e5f54] bg-[#26201c] text-stone-100 font-medium"
                            : "border-[#2d2621] hover:border-[#3e352f] bg-[#14110f] text-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-200">{s.section} — {s.title}</span>
                          <span className="text-[11px] font-mono text-stone-400">{s.confidence} match</span>
                        </div>
                        <p className="text-stone-400 mt-1">{s.description}</p>
                        <p className="text-[11px] text-stone-300 mt-1 font-mono">Penalty: {s.penalty}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="officerConfirm"
                    checked={officerConfirmed}
                    onChange={(e) => setOfficerConfirmed(e.target.checked)}
                    className="rounded border-[#3e352f] bg-[#100e0c]"
                  />
                  <label htmlFor="officerConfirm" className="text-xs text-stone-300">
                    I confirm as the Investigating Officer that these sections accurately map to the verified facts.
                  </label>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRegisterFir}
                    disabled={!officerConfirmed || selectedBns.length === 0}
                    className="bw-btn-primary px-5 py-2.5 text-xs font-semibold"
                  >
                    Register FIR in Central Ledger
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow Police Agency Workspace • BNS / BNSS Statutory Alignment
      </footer>
    </div>
  );
}
