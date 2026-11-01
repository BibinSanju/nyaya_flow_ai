"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Search,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Mic,
  Square,
  Loader2,
  X,
  Check,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import {
  apiClassifyCase,
  apiListPetitions,
  apiGetDocuments,
  apiTranscribeAudio,
  apiCreatePetition,
  openDocument,
} from "@/utils/api";
import AppHeader from "@/components/ui/app-header";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import DocumentUpload, { UploadedDocRecord } from "@/components/document-upload";
import AppealAnalysisModal from "@/components/appeal-analysis-modal";
import CourtSummonsModal from "@/components/court-summons-modal";
import CnrTracker from "@/components/cnr-tracker";
import {
  INDIAN_STATES_AND_DISTRICTS,
  COURT_AUTHORITY_OPTIONS,
  getSuggestedNearbyCourts,
  getStructuredStatutoryProvisions,
  StatutoryProvision,
  SuggestedCourt
} from "@/data/jurisdictionData";

const empaneledCounsel = [
  {
    id: "counsel-1",
    name: "Adv. Abhishek Deshmukh",
    barNo: "BCI/MAH/4921-2015",
    specialization: "Civil & Land Revenue Law",
    forum: "Sub-Divisional Magistrate Court & Civil Court, Pune",
    type: "DLSA Empaneled Legal Aid Counsel",
    languages: "Marathi, Hindi, English",
  },
  {
    id: "counsel-2",
    name: "Adv. Meera Sen",
    barNo: "BCI/DEL/3109-2017",
    specialization: "Family & Property Partition Law",
    forum: "District & Subordinate Courts",
    type: "State Legal Services Panel",
    languages: "Hindi, English, Bengali",
  },
  {
    id: "counsel-3",
    name: "Adv. Rohan Malhotra",
    barNo: "BCI/PUN/2180-2012",
    specialization: "Cyber Law & Criminal Defense",
    forum: "Chief Judicial Magistrate Court",
    type: "Bar Association Pro Bono Panel",
    languages: "Hindi, Punjabi, English",
  },
];

export default function CitizenDashboard() {
  const [activeTab, setActiveTab] = useState<"new-petition" | "track-case" | "documents">("new-petition");
  const [wizardStep, setWizardStep] = useState(1);

  // Form State
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    phoneVerified: false,
    district: "",
    state: "",
    selectedCourtType: "dont_know",
    customCourtName: "",
    language: "English",
    idProof: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    district: "",
    state: "",
    selectedCourtType: "dont_know",
    customCourtName: "",
    language: "English",
    idProof: "",
  });

  // Mask Aadhaar per Section 63 BSA & UIDAI directives (•••• •••• XXXX)
  const maskAadhaar = (aadhaarStr: string) => {
    if (!aadhaarStr) return "";
    const clean = aadhaarStr.replace(/\D/g, "");
    if (clean.length >= 4) {
      return `•••• •••• ${clean.slice(-4)}`;
    }
    if (aadhaarStr.includes("••••")) {
      return aadhaarStr;
    }
    return "•••• •••• ••••";
  };
  const [problemDescription, setProblemDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [sttFeedback, setSttFeedback] = useState<string | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);

  // AI Classification State
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [analyzingCase, setAnalyzingCase] = useState(false);
  const [caseValidationError, setCaseValidationError] = useState<string | null>(null);

  // Counsel & Submission State
  const [selectedCounsel, setSelectedCounsel] = useState<string | null>("counsel-1");
  const [representationType, setRepresentationType] = useState<"legal-aid" | "private" | "self">("legal-aid");
  const [privateAdvocate, setPrivateAdvocate] = useState({ name: "", barNo: "" });

  // Uploaded Documents
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocRecord[]>([]);
  const [submittedPetition, setSubmittedPetition] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active Petitions & Server Docs
  const [petitions, setPetitions] = useState<any[]>([]);
  const [serverDocuments, setServerDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingPetitions, setIsLoadingPetitions] = useState(false);
  const [selectedCaseForAppeal, setSelectedCaseForAppeal] = useState<any>(null);
  const [selectedCaseForSummons, setSelectedCaseForSummons] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      if (stored) {
        const u = JSON.parse(stored);

        // 1. Contact separation (strict: email is email, phone is only phone)
        let emailVal = "";
        let phoneVal = "";

        if (typeof u.email === "string" && u.email.includes("@")) {
          emailVal = u.email.trim();
        }

        if (typeof u.phone === "string") {
          if (u.phone.includes("@")) {
            if (!emailVal) emailVal = u.phone.trim();
          } else {
            const digits = u.phone.replace(/\D/g, "");
            if (digits.length >= 7) {
              phoneVal = u.phone.trim();
            }
          }
        }

        if (!phoneVal && typeof u.mobile === "string") {
          const digits = u.mobile.replace(/\D/g, "");
          if (digits.length >= 7) phoneVal = u.mobile.trim();
        }

        // 2. Name resolution (Display actual profile name, never fallback to "Citizen Litigant" if name exists)
        const rawName = u.fullName || u.name || u.full_name || "";
        const genericNames = ["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"];
        let actualName = "";
        if (rawName && !genericNames.includes(rawName.trim())) {
          actualName = rawName.trim();
        } else if (emailVal) {
          actualName = emailVal.split("@")[0];
        }

        // 3. Phone verification: only true if user verified and valid phone exists
        const phoneVerified = Boolean(u.phoneVerified && phoneVal);

        // 4. Aadhaar (§ 63 BSA masked)
        const idProofVal = u.idProof || u.aadhaar || "";

        const loaded = {
          name: actualName || rawName || "Litigant",
          email: emailVal,
          phone: phoneVal,
          phoneVerified: phoneVerified,
          district: u.district || "",
          state: u.state || "",
          selectedCourtType: u.selectedCourtType || "dont_know",
          customCourtName: u.customCourtName || "",
          language: u.language || "English",
          idProof: idProofVal,
        };
        setPersonalInfo(loaded);
        setEditProfileForm(loaded);
      } else {
        const defaultGuest = {
          name: "Litigant",
          email: "",
          phone: "",
          phoneVerified: false,
          district: "",
          state: "",
          selectedCourtType: "dont_know",
          customCourtName: "",
          language: "English",
          idProof: "",
        };
        setPersonalInfo(defaultGuest);
        setEditProfileForm(defaultGuest);
      }
    } catch (e) {}
    loadPetitionsAndDocs();
  }, []);

  const handleSaveProfile = () => {
    let phoneToSave = editProfileForm.phone.trim();
    if (phoneToSave.includes("@")) {
      if (!editProfileForm.email) editProfileForm.email = phoneToSave;
      phoneToSave = "";
    }

    let aadhaarToSave = editProfileForm.idProof.trim() || personalInfo.idProof;
    if (aadhaarToSave) {
      const digits = aadhaarToSave.replace(/\D/g, "");
      if (digits.length >= 4) {
        aadhaarToSave = `•••• •••• ${digits.slice(-4)}`;
      }
    }

    const updatedProfile = {
      ...personalInfo,
      ...editProfileForm,
      phone: phoneToSave,
      phoneVerified: phoneToSave && phoneToSave === personalInfo.phone ? personalInfo.phoneVerified : false,
      idProof: aadhaarToSave,
    };

    setPersonalInfo(updatedProfile);
    setIsEditingProfile(false);
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      const current = stored ? JSON.parse(stored) : {};
      const updated = {
        ...current,
        fullName: updatedProfile.name,
        name: updatedProfile.name,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        phoneVerified: updatedProfile.phoneVerified,
        district: updatedProfile.district,
        state: updatedProfile.state,
        selectedCourtType: updatedProfile.selectedCourtType,
        customCourtName: updatedProfile.customCourtName,
        language: updatedProfile.language,
        idProof: updatedProfile.idProof,
      };
      localStorage.setItem("nyayaflow_user", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist user profile:", e);
    }
  };

  const loadPetitionsAndDocs = async () => {
    setIsLoadingPetitions(true);
    try {
      const petitionData = await apiListPetitions();
      if (Array.isArray(petitionData)) setPetitions(petitionData);

      const docsData = await apiGetDocuments();
      if (docsData?.documents) setServerDocuments(docsData.documents);
    } catch (err) {
      console.warn("Could not load initial records:", err);
    } finally {
      setIsLoadingPetitions(false);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
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

    // If currently recording, user clicks to stop and transcribe
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
        // Stop microphone stream tracks so browser mic indicator turns off
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
        setSttFeedback("Transcribing speech with Groq Whisper AI...");

        try {
          const langMap: Record<string, string> = {
            Marathi: "mr",
            Hindi: "hi",
            English: "en",
            Tamil: "ta",
            Telugu: "te",
            Kannada: "kn",
            Bengali: "bn",
            Gujarati: "gu",
          };
          const targetLang = langMap[personalInfo.language] || "auto";

          const res = await apiTranscribeAudio(audioBlob, targetLang);
          if (res?.text && res.text.trim()) {
            const transcribed = res.text.trim();
            setProblemDescription((prev) => (prev.trim() ? `${prev.trim()}\n\n${transcribed}` : transcribed));
            setSttFeedback(
              `✓ Transcribed ${res.duration ? `${Math.round(res.duration)}s ` : ""}speech (${res.language || personalInfo.language})`
            );
            setTimeout(() => setSttFeedback(null), 6000);
          } else if (liveCaptured) {
            setProblemDescription((prev) => (prev.trim() ? `${prev.trim()}\n\n${liveCaptured}` : liveCaptured));
            setSttFeedback(`✓ Captured speech in ${personalInfo.language} via Speech Engine`);
            setTimeout(() => setSttFeedback(null), 6000);
          } else {
            setSttFeedback("No audible speech detected. Please check microphone volume and try again.");
          }
        } catch (transcribeErr: any) {
          console.warn("Groq STT transcription warning:", transcribeErr);
          if (liveCaptured) {
            setProblemDescription((prev) => (prev.trim() ? `${prev.trim()}\n\n${liveCaptured}` : liveCaptured));
            setSttFeedback(`✓ Transcribed statement in ${personalInfo.language}`);
            setTimeout(() => setSttFeedback(null), 6000);
          } else {
            setSttError(
              transcribeErr?.message ||
                "Could not transcribe audio. Check connection or type dispute details manually."
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
            const bcp47Map: Record<string, string> = {
              English: "en-IN",
              Hindi: "hi-IN",
              Marathi: "mr-IN",
              Tamil: "ta-IN",
              Telugu: "te-IN",
              Kannada: "kn-IN",
              Bengali: "bn-IN",
              Gujarati: "gu-IN",
            };
            rec.lang = bcp47Map[personalInfo.language] || "en-IN";
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

      // Start recording with 250ms chunks
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start 1s interval with 60s auto-stop
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

  const handleClassify = async () => {
    setCaseValidationError(null);
    const text = problemDescription.trim();

    if (!text) {
      setCaseValidationError("Please enter your dispute narrative before proceeding.");
      return;
    }

    // Fast pre-check for conversational greetings or trivial banter
    const trivialGreetingRegex = /^(hi|hello|hey|namaste|vanakkam|good\s+(morning|afternoon|evening|day)|how\s+are\s+you|testing|test(\s+123)?|what\s+is\s+up|sup)[\s.!?,]*$/i;
    if (trivialGreetingRegex.test(text) || text.length < 12) {
      setCaseValidationError(
        `"${text}" is not recognized as a valid legal case. Casual greetings or conversational questions cannot be processed for judicial petition filing. Please describe your concrete legal grievance or dispute (e.g. land encroachment, cheque bounce, theft, or breach of contract).`
      );
      return;
    }

    setAnalyzingCase(true);
    try {
      const res = await apiClassifyCase(text, personalInfo.language);

      if (!res || res.success === false || res.isValidCase === false) {
        setCaseValidationError(
          res?.error ||
          res?.reason ||
          "The entered sentence does not describe a valid court grievance. Please provide factual details of the dispute or incident."
        );
        return;
      }

      setClassificationResult(res);
      setCaseValidationError(null);
      setWizardStep(2);
    } catch (err: any) {
      console.warn("Classification error:", err);
      setCaseValidationError(
        err?.message ||
        "The entered text is not a valid legal dispute description. Please describe your legal dispute (parties involved, property, or grievance)."
      );
    } finally {
      setAnalyzingCase(false);
    }
  };

  const handleDocUploaded = (doc: UploadedDocRecord) => {
    setUploadedDocs((prev) => [doc, ...prev]);
    loadPetitionsAndDocs();
  };

  const handleSubmitPetition = async () => {
    const advocateName =
      representationType === "legal-aid"
        ? empaneledCounsel.find((c) => c.id === selectedCounsel)?.name || "Legal Aid Counsel"
        : representationType === "private"
        ? privateAdvocate.name || "Private Counsel"
        : "In-Person (Self)";

    const effectiveCourt =
      personalInfo.selectedCourtType && personalInfo.selectedCourtType !== "dont_know"
        ? personalInfo.selectedCourtType === "custom"
          ? personalInfo.customCourtName || "Custom Specified Forum"
          : COURT_AUTHORITY_OPTIONS.find((c) => c.id === personalInfo.selectedCourtType)?.name || "Subordinate Civil Court"
        : getSuggestedNearbyCourts(
            personalInfo.state,
            personalInfo.district,
            classificationResult?.category
          )[0]?.name || `Subordinate Civil Court, ${personalInfo.district}`;

    const newPetition = {
      citizen_name:
        personalInfo.name && personalInfo.name !== "Citizen Litigant"
          ? personalInfo.name
          : "Litigant",
      contact: personalInfo.email || (personalInfo.phoneVerified ? personalInfo.phone : "") || "Not provided",
      category: classificationResult?.category || "Property & Land Dispute (Civil)",
      description: problemDescription,
      status: "Scrutiny Pending",
      suggested_court: effectiveCourt,
      advocate_name: advocateName,
      language: personalInfo.language || "English",
      health_score: 92,
    };

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiCreatePetition(newPetition);
      if (!res?.petition) throw new Error(res?.error || "The registry did not accept the submission.");
      const petWithDocs = { ...res.petition, documents_count: uploadedDocs.length };
      setSubmittedPetition(petWithDocs);
      setPetitions((prev) => [petWithDocs, ...prev]);
      setWizardStep(4);
    } catch (err: any) {
      setSubmitError(err?.message || "Could not submit your petition. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourtName =
    !personalInfo.selectedCourtType || personalInfo.selectedCourtType === "dont_know"
      ? undefined
      : personalInfo.selectedCourtType === "custom"
      ? personalInfo.customCourtName || "Court you specified"
      : COURT_AUTHORITY_OPTIONS.find((c) => c.id === personalInfo.selectedCourtType)?.name;

  const filteredPetitions = petitions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.cnr_number || "").toLowerCase().includes(q) ||
      String(p.id || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  const resetWizard = () => {
    setWizardStep(1);
    setProblemDescription("");
    setClassificationResult(null);
    setUploadedDocs([]);
    setSubmitError(null);
  };

  const navItems = [
    { id: "new-petition" as const, label: "File a petition", icon: FileText },
    { id: "track-case" as const, label: "My cases", icon: Search },
    { id: "documents" as const, label: "Documents", icon: FolderOpen },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader workspace="Citizen" userName={personalInfo.name} userDetail={personalInfo.email} />

      <div className="container-page py-6 sm:py-8 flex-1 w-full grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <nav className="card p-2 flex lg:flex-col gap-1 overflow-x-auto" aria-label="Citizen workspace">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={activeTab === item.id ? "page" : undefined}
                  className="nav-item whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <section className="card hidden lg:block">
            <div className="card-header py-3">
              <h2 className="text-sm font-semibold text-ink">Your details</h2>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(!isEditingProfile);
                  if (!isEditingProfile) setEditProfileForm({ ...personalInfo, idProof: "" });
                }}
                className="text-xs font-medium text-brand hover:underline cursor-pointer"
              >
                {isEditingProfile ? "Cancel" : "Edit"}
              </button>
            </div>

            {isEditingProfile ? (
              <form
                className="card-body space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveProfile();
                }}
              >
                <div>
                  <label className="label" htmlFor="pf-name">Full name</label>
                  <input
                    id="pf-name"
                    className="input"
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pf-phone">Phone</label>
                  <input
                    id="pf-phone"
                    type="tel"
                    className="input"
                    value={editProfileForm.phone}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pf-aadhaar">Aadhaar</label>
                  <input
                    id="pf-aadhaar"
                    inputMode="numeric"
                    className="input font-mono"
                    value={editProfileForm.idProof}
                    onChange={(e) =>
                      setEditProfileForm({
                        ...editProfileForm,
                        idProof: e.target.value.replace(/\D/g, "").slice(0, 12),
                      })
                    }
                    placeholder={personalInfo.idProof || "12 digits"}
                  />
                  <p className="hint">Only the last 4 digits are kept.</p>
                </div>
                <button type="submit" className="btn btn-primary btn-sm w-full">
                  Save
                </button>
              </form>
            ) : (
              <dl className="card-body space-y-3 text-sm">
                <ProfileRow label="Name" value={personalInfo.name} />
                <ProfileRow label="Email" value={personalInfo.email} />
                <ProfileRow label="Phone" value={personalInfo.phone} />
                <ProfileRow label="Aadhaar" value={personalInfo.idProof ? maskAadhaar(personalInfo.idProof) : ""} mono />
                <ProfileRow label="Location" value={[personalInfo.district, personalInfo.state].filter(Boolean).join(", ")} />
              </dl>
            )}
          </section>
        </aside>

        {/* Main */}
        <main className="min-w-0 space-y-6">
          {activeTab === "new-petition" && (
            <>
              <PageHeader
                title="File a petition"
                description="Describe your problem, review the suggested court and laws, attach documents, then submit to the court registry."
              />

              <div className="card">
                <ol className="flex border-b border-line overflow-x-auto overflow-y-hidden">
                  {["Describe", "Review", "Documents", "Submitted"].map((label, idx) => {
                    const step = idx + 1;
                    const done = wizardStep > step;
                    const current = wizardStep === step;
                    return (
                      <li
                        key={label}
                        className={`flex-1 min-w-[120px] flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px ${
                          current ? "border-brand text-ink font-medium" : done ? "border-transparent text-ink-2" : "border-transparent text-faint"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            done ? "bg-success text-white" : current ? "bg-brand text-white" : "bg-subtle text-muted"
                          }`}
                        >
                          {done ? <Check className="w-3.5 h-3.5" /> : step}
                        </span>
                        {label}
                      </li>
                    );
                  })}
                </ol>

                {/* STEP 1 */}
                {wizardStep === 1 && (
                  <div className="card-body space-y-6">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <label htmlFor="grievance" className="label mb-0">What happened?</label>
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
                              Speak in {personalInfo.language}
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-muted mb-2">
                        Write in your own words, in any language. Include who is involved, where, when, and what you want the court to do.
                      </p>

                      {isRecording && (
                        <div className="callout callout-error mb-2">
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-danger animate-pulse shrink-0" />
                          <div className="flex-1">
                            <p>Listening… speak clearly. Recording stops automatically after 60 seconds.</p>
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
                        id="grievance"
                        rows={6}
                        value={problemDescription}
                        onChange={(e) => {
                          setProblemDescription(e.target.value);
                          if (caseValidationError) setCaseValidationError(null);
                        }}
                        placeholder="Example: My neighbour built a wall 3 feet inside my registered plot without my consent. I want the wall removed."
                        className={`input ${caseValidationError ? "border-danger" : ""}`}
                        aria-invalid={!!caseValidationError}
                      />

                      {caseValidationError && (
                        <div className="callout callout-error mt-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <p>{caseValidationError}</p>
                            <p className="text-ink-2">
                              Try an example:{" "}
                              {EXAMPLE_GRIEVANCES.map((ex, i) => (
                                <span key={ex.label}>
                                  {i > 0 && " · "}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProblemDescription(ex.text);
                                      setCaseValidationError(null);
                                    }}
                                    className="underline underline-offset-2 hover:text-ink cursor-pointer"
                                  >
                                    {ex.label}
                                  </button>
                                </span>
                              ))}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="divider" />

                    <fieldset className="space-y-4">
                      <legend className="text-sm font-semibold text-ink">Where should this be filed?</legend>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor="state" className="label">State / UT</label>
                          <select
                            id="state"
                            value={personalInfo.state || ""}
                            onChange={(e) => {
                              const newState = e.target.value;
                              setPersonalInfo({ ...personalInfo, state: newState, district: "" });
                            }}
                            className="input"
                          >
                            <option value="" disabled>Select state</option>
                            {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="district" className="label">District</label>
                          <select
                            id="district"
                            value={personalInfo.district || ""}
                            onChange={(e) => setPersonalInfo({ ...personalInfo, district: e.target.value })}
                            disabled={!personalInfo.state}
                            className="input"
                          >
                            <option value="" disabled>{personalInfo.state ? "Select district" : "Select a state first"}</option>
                            {(INDIAN_STATES_AND_DISTRICTS[personalInfo.state] || []).map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="language" className="label">Language</label>
                          <select
                            id="language"
                            value={personalInfo.language || "English"}
                            onChange={(e) => setPersonalInfo({ ...personalInfo, language: e.target.value })}
                            className="input"
                          >
                            {LANGUAGES.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="court" className="label">Court or authority</label>
                        <select
                          id="court"
                          value={personalInfo.selectedCourtType || "dont_know"}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, selectedCourtType: e.target.value })}
                          className="input"
                        >
                          {COURT_AUTHORITY_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                        {personalInfo.selectedCourtType === "custom" && (
                          <input
                            type="text"
                            value={personalInfo.customCourtName || ""}
                            onChange={(e) => setPersonalInfo({ ...personalInfo, customCourtName: e.target.value })}
                            placeholder="Name of the court, tribunal or authority"
                            className="input mt-2"
                          />
                        )}
                        {(!personalInfo.selectedCourtType || personalInfo.selectedCourtType === "dont_know") && (
                          <p className="hint">
                            Not sure? We&apos;ll suggest courts based on your description and the location you choose.
                          </p>
                        )}
                      </div>
                    </fieldset>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleClassify}
                        disabled={analyzingCase || !problemDescription.trim() || !personalInfo.state || !personalInfo.district}
                        className="btn btn-primary"
                      >
                        {analyzingCase ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {analyzingCase ? "Analysing…" : "Continue"}
                        {!analyzingCase && <ArrowRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {wizardStep === 2 && classificationResult && (
                  <div className="card-body space-y-6">
                    <section>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-brand">{classificationResult.category}</span>
                        {classificationResult.confidence && (
                          <span className="text-xs text-muted">Confidence: {classificationResult.confidence}</span>
                        )}
                      </div>
                      {(classificationResult.simple_explanation || classificationResult.simpleExplanation) && (
                        <p className="mt-3 text-sm text-ink-2 leading-relaxed">
                          {classificationResult.simple_explanation || classificationResult.simpleExplanation}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-muted">
                        Typical time to first hearing: {classificationResult.timeline || "6–12 months, depending on the court's list"}.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-ink mb-2">
                        {selectedCourtName ? "Court you selected" : `Suggested courts in ${personalInfo.district}`}
                      </h3>
                      {selectedCourtName ? (
                        <div className="border border-line rounded-lg p-3 text-sm">
                          <p className="font-medium text-ink">{selectedCourtName}</p>
                          <p className="text-muted mt-0.5">
                            The registry will confirm this court has jurisdiction over your case.
                          </p>
                        </div>
                      ) : (
                        <ul className="border border-line rounded-lg divide-y divide-line">
                          {getSuggestedNearbyCourts(
                            personalInfo.state,
                            personalInfo.district,
                            classificationResult.category
                          ).map((c, i) => (
                            <li key={i} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                              <div>
                                <p className="font-medium text-ink">{c.name}</p>
                                <p className="text-muted">{c.jurisdiction}</p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <span className="badge">{c.forumType}</span>
                                <span className="badge">{c.distance}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="hint">The right court depends on the facts and the law that applies. Treat this as a starting point.</p>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-ink mb-2">Laws that may apply</h3>
                      <div className="space-y-3">
                        {getStructuredStatutoryProvisions(classificationResult.category, problemDescription).map(
                          (item: StatutoryProvision, idx: number) => (
                            <article key={idx} className="border border-line rounded-lg p-4 text-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-ink">{item.law_name}</p>
                                  <p className="text-ink-2 font-mono text-xs mt-0.5">{item.section_rule}</p>
                                </div>
                                {item.official_source_url && (
                                  <a
                                    href={item.official_source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                                  >
                                    Read on India Code
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <p className="mt-3 text-ink-2 leading-relaxed">{item.plain_explanation}</p>
                              <p className="mt-2 text-ink-2 leading-relaxed">
                                <span className="font-medium text-ink">Why it may apply: </span>
                                {item.relevance}
                              </p>
                              <p className="mt-2 text-xs text-muted">{item.disclaimer}</p>
                            </article>
                          )
                        )}
                      </div>
                    </section>

                    {(classificationResult.required_documents || classificationResult.documents)?.length > 0 && (
                      <section>
                        <h3 className="text-sm font-semibold text-ink mb-2">Documents you&apos;ll likely need</h3>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {(classificationResult.required_documents || classificationResult.documents).map(
                            (doc: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-ink-2">
                                <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                                {doc}
                              </li>
                            )
                          )}
                        </ul>
                      </section>
                    )}

                    <div className="flex justify-between">
                      <button type="button" onClick={() => setWizardStep(1)} className="btn btn-secondary">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button type="button" onClick={() => setWizardStep(3)} className="btn btn-primary">
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {wizardStep === 3 && (
                  <div className="card-body space-y-6">
                    <section>
                      <h3 className="text-sm font-semibold text-ink">Attach documents</h3>
                      <p className="text-sm text-muted mt-0.5 mb-3">
                        For example: ID proof, land records (7/12 extract), agreements, photos or receipts. PDF, JPG or PNG up to 15 MB.
                      </p>
                      <DocumentUpload onUploadSuccess={handleDocUploaded} label="Upload a document" userId={personalInfo.name} />

                      {uploadedDocs.length > 0 && (
                        <ul className="mt-3 border border-line rounded-lg divide-y divide-line">
                          {uploadedDocs.map((doc, idx) => (
                            <li key={idx} className="p-3 flex items-center justify-between gap-3 text-sm">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-4 h-4 text-muted shrink-0" />
                                <span className="truncate text-ink">{doc.originalName}</span>
                                <span className="text-xs text-muted shrink-0">{(doc.size / 1024).toFixed(0)} KB</span>
                              </div>
                              <span className="badge badge-success">Attached</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <div className="divider" />

                    <fieldset>
                      <legend className="text-sm font-semibold text-ink mb-3">Who will represent you?</legend>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {REPRESENTATION_OPTIONS.map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer ${
                              representationType === opt.id ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong"
                            }`}
                          >
                            <input
                              type="radio"
                              name="representation"
                              value={opt.id}
                              checked={representationType === opt.id}
                              onChange={() => setRepresentationType(opt.id)}
                              className="mt-0.5 accent-[var(--color-brand)]"
                            />
                            <span>
                              <span className="block text-sm font-medium text-ink">{opt.title}</span>
                              <span className="block text-xs text-muted">{opt.desc}</span>
                            </span>
                          </label>
                        ))}
                      </div>

                      {representationType === "legal-aid" && (
                        <div className="mt-4">
                          <label htmlFor="counsel" className="label">Legal aid advocate</label>
                          <select
                            id="counsel"
                            value={selectedCounsel || ""}
                            onChange={(e) => setSelectedCounsel(e.target.value)}
                            className="input"
                          >
                            {empaneledCounsel.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} — {c.specialization}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {representationType === "private" && (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="adv-name" className="label">Advocate&apos;s name</label>
                            <input
                              id="adv-name"
                              className="input"
                              value={privateAdvocate.name}
                              onChange={(e) => setPrivateAdvocate({ ...privateAdvocate, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label htmlFor="adv-bar" className="label">Bar Council enrolment no.</label>
                            <input
                              id="adv-bar"
                              className="input"
                              value={privateAdvocate.barNo}
                              onChange={(e) => setPrivateAdvocate({ ...privateAdvocate, barNo: e.target.value })}
                              placeholder="e.g. MAH/1234/2015"
                            />
                          </div>
                        </div>
                      )}
                    </fieldset>

                    {submitError && (
                      <div className="callout callout-error" role="alert">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <button type="button" onClick={() => setWizardStep(2)} className="btn btn-secondary">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button type="button" onClick={handleSubmitPetition} disabled={isSubmitting} className="btn btn-primary">
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? "Submitting…" : "Submit to registry"}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4 */}
                {wizardStep === 4 && (
                  <div className="card-body space-y-6 max-w-2xl">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-full bg-success-soft text-success flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-ink">Petition submitted</h2>
                        <p className="text-sm text-ink-2 mt-1">
                          Your petition and documents have been sent to the court registry for scrutiny.
                        </p>
                      </div>
                    </div>

                    <div className="callout callout-warning">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>
                        <strong className="font-semibold">This is not yet acceptance by the court.</strong> The registry first checks
                        every filing for defects. A CNR number is issued only after it passes scrutiny.
                      </p>
                    </div>

                    {submittedPetition && (
                      <dl className="grid gap-px sm:grid-cols-2 bg-line border border-line rounded-lg overflow-hidden text-sm">
                        <ReceiptRow label="Reference number" value={String(submittedPetition.id)} mono />
                        <ReceiptRow label="Status" value={submittedPetition.status || "Scrutiny pending"} />
                        <ReceiptRow label="CNR number" value={submittedPetition.cnr_number || "Issued after scrutiny"} mono={!!submittedPetition.cnr_number} />
                        <ReceiptRow label="Category" value={submittedPetition.category} />
                        <ReceiptRow label="Court" value={submittedPetition.suggested_court || "To be confirmed"} />
                        <ReceiptRow label="Documents" value={`${submittedPetition.documents_count ?? uploadedDocs.length} attached`} />
                      </dl>
                    )}

                    <section>
                      <h3 className="text-sm font-semibold text-ink mb-2">What happens next</h3>
                      <ol className="space-y-2 text-sm text-ink-2 list-decimal pl-5">
                        <li>Registry staff check jurisdiction, court fees and required documents.</li>
                        <li>If something is missing, you&apos;ll be asked to fix it (usually within 14 days).</li>
                        <li>Once cleared, a CNR number is issued and the case is listed before a judge.</li>
                      </ol>
                    </section>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("track-case");
                          resetWizard();
                        }}
                        className="btn btn-primary"
                      >
                        View my cases
                      </button>
                      <button type="button" onClick={resetWizard} className="btn btn-secondary">
                        File another petition
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "track-case" && (
            <>
              <PageHeader title="My cases" description="Petitions you've filed and their current status." />

              <div className="card">
                <div className="card-header">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by CNR, category or description"
                      aria-label="Search cases"
                      className="input pl-9"
                    />
                  </div>
                  <button type="button" onClick={loadPetitionsAndDocs} className="btn btn-ghost btn-sm" disabled={isLoadingPetitions}>
                    <RefreshCw className={`w-4 h-4 ${isLoadingPetitions ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>

                {isLoadingPetitions && petitions.length === 0 ? (
                  <div className="p-10 flex justify-center text-muted">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : filteredPetitions.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title={petitions.length === 0 ? "No petitions yet" : "No matching cases"}
                    description={petitions.length === 0 ? "Petitions you file will appear here." : "Try a different search."}
                    action={
                      petitions.length === 0 ? (
                        <button type="button" onClick={() => setActiveTab("new-petition")} className="btn btn-primary btn-sm">
                          File a petition
                        </button>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Case</th>
                          <th>Description</th>
                          <th>Counsel</th>
                          <th>Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPetitions.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td className="whitespace-nowrap">
                              {p.cnr_number ? (
                                <span className="font-mono text-ink">{p.cnr_number}</span>
                              ) : (
                                <span className="text-muted">No CNR yet</span>
                              )}
                              <div className="text-xs text-muted mt-0.5">{p.category}</div>
                            </td>
                            <td className="max-w-xs">
                              <p className="line-clamp-2">{p.description}</p>
                            </td>
                            <td className="whitespace-nowrap">{p.advocate_name || "—"}</td>
                            <td>
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <button type="button" onClick={() => setSelectedCaseForSummons(p)} className="btn btn-ghost btn-sm">
                                Summons
                              </button>
                              <button type="button" onClick={() => setSelectedCaseForAppeal(p)} className="btn btn-ghost btn-sm">
                                Appeal
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <CnrTracker />
            </>
          )}

          {activeTab === "documents" && (
            <>
              <PageHeader title="Documents" description="Files you've uploaded, with text extracted for the registry." />

              <div className="card card-body">
                <DocumentUpload onUploadSuccess={() => loadPetitionsAndDocs()} label="Upload a document" userId={personalInfo.name} />
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Uploaded files</h2>
                  <span className="text-sm text-muted">{serverDocuments.length}</span>
                </div>
                {serverDocuments.length === 0 ? (
                  <EmptyState icon={FolderOpen} title="No documents yet" description="Upload a PDF or image to get started." />
                ) : (
                  <ul className="divide-y divide-line">
                    {serverDocuments.map((doc, idx) => (
                      <li key={doc.id || idx} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-muted shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{doc.originalName}</p>
                            <p className="text-xs text-muted">
                              {(doc.size / 1024).toFixed(0)} KB
                              {doc.scanResult?.detectedDocType && ` · ${doc.scanResult.detectedDocType}`}
                              {doc.scanResult?.wordCount != null && ` · ${doc.scanResult.wordCount} words`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDocument(doc.id).catch((e) => alert(e.message))}
                          className="btn btn-secondary btn-sm shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <AppealAnalysisModal
        isOpen={!!selectedCaseForAppeal}
        onClose={() => setSelectedCaseForAppeal(null)}
        caseData={
          selectedCaseForAppeal
            ? {
                id: selectedCaseForAppeal.id,
                cnr: selectedCaseForAppeal.cnr_number,
                petitioner: selectedCaseForAppeal.citizen_name || personalInfo.name,
                court: selectedCaseForAppeal.suggested_court,
                category: selectedCaseForAppeal.category,
                description: selectedCaseForAppeal.description,
              }
            : undefined
        }
      />

      <CourtSummonsModal
        isOpen={!!selectedCaseForSummons}
        onClose={() => setSelectedCaseForSummons(null)}
        petition={selectedCaseForSummons}
      />
    </div>
  );
}

const LANGUAGES = ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Gujarati"];

const REPRESENTATION_OPTIONS: { id: "legal-aid" | "private" | "self"; title: string; desc: string }[] = [
  { id: "legal-aid", title: "Free legal aid", desc: "Advocate from the legal services panel" },
  { id: "private", title: "My own advocate", desc: "An advocate you have engaged" },
  { id: "self", title: "Myself", desc: "Appear in person" },
];

const EXAMPLE_GRIEVANCES = [
  {
    label: "Land encroachment",
    text: "My neighbour built a boundary wall 3 feet inside my registered agricultural plot without my consent.",
  },
  {
    label: "Cheque bounce",
    text: "A cheque for ₹2,50,000 given to me for a goods supply was returned by the bank for insufficient funds. The buyer has not paid despite notice.",
  },
  {
    label: "Defective product",
    text: "A dealer sold me a defective refrigerator and refuses to repair or replace it under warranty.",
  },
];

function ProfileRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-ink break-words ${mono ? "font-mono" : ""}`}>{value || <span className="text-faint">Not added</span>}</dd>
    </div>
  );
}

function ReceiptRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 text-ink break-words ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "Scrutiny pending").toLowerCase();
  const tone = s.includes("cnr") || s.includes("admitted") || s.includes("listed")
    ? "badge-success"
    : s.includes("defect") || s.includes("reject") || s.includes("returned")
    ? "badge-danger"
    : s.includes("disposed")
    ? ""
    : "badge-warning";
  return <span className={`badge ${tone}`}>{status || "Scrutiny pending"}</span>;
}
