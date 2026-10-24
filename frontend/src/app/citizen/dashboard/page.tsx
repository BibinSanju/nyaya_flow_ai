"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Scale,
  Search,
  CheckCircle,
  AlertCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Shield,
  Briefcase,
  LogOut,
  Building,
  RefreshCw,
  Eye,
  CheckCircle2,
  Trash2,
  Mic,
  Square,
  Loader2,
  Edit2,
  Save,
  MapPin,
  Mail,
  Phone as PhoneIcon,
  User
} from "lucide-react";
import {
  apiClassifyCase,
  apiListPetitions,
  apiGetDocuments,
  apiTranscribeAudio,
  apiCreatePetition
} from "@/utils/api";
import DocumentUpload, { UploadedDocRecord } from "@/components/document-upload";
import AppealAnalysisModal from "@/components/appeal-analysis-modal";
import CourtSummonsModal from "@/components/court-summons-modal";
import CnrTracker from "@/components/cnr-tracker";

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
    district: "",
    state: "",
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
    language: "English",
    idProof: "",
  });
  const [problemDescription, setProblemDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
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
        const rawContact = u.email || u.phone || "";
        const isEmailContact = typeof rawContact === "string" && rawContact.includes("@");
        const loaded = {
          name: u.fullName || u.name || "Citizen Litigant",
          email: isEmailContact ? rawContact : (u.email || ""),
          phone: !isEmailContact ? rawContact : (u.phone || ""),
          district: u.district || "",
          state: u.state || "",
          language: u.language || "English",
          idProof: u.idProof || "",
        };
        setPersonalInfo(loaded);
        setEditProfileForm(loaded);
      } else {
        const defaultGuest = {
          name: "Citizen Litigant",
          email: "",
          phone: "",
          district: "",
          state: "",
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
    setPersonalInfo(editProfileForm);
    setIsEditingProfile(false);
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      const current = stored ? JSON.parse(stored) : {};
      const updated = {
        ...current,
        fullName: editProfileForm.name,
        email: editProfileForm.email,
        phone: editProfileForm.phone,
        district: editProfileForm.district,
        state: editProfileForm.state,
        language: editProfileForm.language,
        idProof: editProfileForm.idProof,
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

        if (audioBlob.size < 500) {
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
          } else {
            setSttFeedback("No audible speech detected. Please check microphone volume and try again.");
          }
        } catch (transcribeErr: any) {
          console.error("Groq STT transcription error:", transcribeErr);
          setSttError(
            transcribeErr?.message ||
              "Could not transcribe audio. Check connection or type dispute details manually."
          );
        } finally {
          setIsTranscribing(false);
        }
      };

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

    const newPetition = {
      citizen_name: personalInfo.name || "Citizen Litigant",
      contact: personalInfo.email || personalInfo.phone || "Not provided",
      category: classificationResult?.category || "Property & Land Dispute (Civil)",
      description: problemDescription,
      status: "Scrutiny Pending",
      suggested_court:
        classificationResult?.suggested_court ||
        (personalInfo.district
          ? `District & Subordinate Court, ${personalInfo.district}`
          : "District & Subordinate Court"),
      advocate_name: advocateName,
      language: personalInfo.language || "English",
      health_score: 92,
    };

    try {
      const res = await apiCreatePetition(newPetition);
      if (res?.petition) {
        setSubmittedPetition(res.petition);
        setPetitions((prev) => [res.petition, ...prev]);
        setWizardStep(4);
        return;
      }
    } catch (err) {
      console.warn("Supabase petition submission failed, using local copy:", err);
    }

    const fallbackPet = {
      ...newPetition,
      id: "CNR-DL-2026-" + Math.floor(10000 + Math.random() * 90000),
      cnr_number: "DLCT01-" + Math.floor(100000 + Math.random() * 900000) + "-2026",
      created_at: new Date().toISOString(),
    };
    setSubmittedPetition(fallbackPet);
    setPetitions((prev) => [fallbackPet, ...prev]);
    setWizardStep(4);
  };

  const handleOpenChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-nyayaflow-chat"));
    }
  };

  return (
    <div className="min-h-screen text-stone-200 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-[#2d2621] sticky top-0 bg-[#12100e]/95 backdrop-blur-md z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded border border-[#3e352f] bg-[#221c18] text-stone-200 flex items-center justify-center font-semibold">
                <Scale className="w-4 h-4 text-stone-300" />
              </div>
              <span className="font-semibold text-base text-stone-100 tracking-tight">NyayaFlow</span>
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-xs font-medium text-stone-400 hidden sm:inline">Citizen Filing Workspace</span>
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
              <p className="text-xs font-semibold text-stone-200">{personalInfo.name || "Citizen Litigant"}</p>
              <p className="text-[11px] text-stone-400 font-mono">
                {personalInfo.email || personalInfo.phone || ([personalInfo.district, personalInfo.state].filter(Boolean).join(", ") || "Pan-India")}
              </p>
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

      {/* Main Workspace Layout */}
      <div className="max-w-6xl mx-auto px-6 py-6 sm:py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="border border-[#2e2722] rounded-xl p-2.5 bg-[#181513]/95 backdrop-blur-md space-y-1.5 shadow-xl shadow-black/40">
            <button
              onClick={() => setActiveTab("new-petition")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "new-petition"
                  ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]"
                  : "text-stone-400 hover:bg-[#1a1614] hover:text-stone-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>File New Grievance</span>
            </button>

            <button
              onClick={() => setActiveTab("track-case")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "track-case"
                  ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]"
                  : "text-stone-400 hover:bg-[#1a1614] hover:text-stone-200"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Registered Cases</span>
            </button>

            <button
              onClick={() => setActiveTab("documents")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "documents"
                  ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]"
                  : "text-stone-400 hover:bg-[#1a1614] hover:text-stone-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Document Repository</span>
            </button>
          </div>

          {/* Litigant Details Panel */}
          <div className="border border-[#2e2722] rounded-xl p-5 bg-[#181513]/95 backdrop-blur-md space-y-3 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Litigant Profile
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditProfileForm(personalInfo);
                  setIsEditingProfile(!isEditingProfile);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditingProfile ? "Cancel" : "Edit Profile"}</span>
              </button>
            </div>

            {isEditingProfile ? (
              <div className="space-y-2.5 pt-1 text-xs animate-in fade-in duration-200">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Full Name</label>
                  <input
                    type="text"
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                    className="bw-input py-1 text-xs"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Email Address</label>
                  <input
                    type="email"
                    value={editProfileForm.email}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                    className="bw-input py-1 text-xs"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Phone (Optional)</label>
                  <input
                    type="text"
                    value={editProfileForm.phone}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                    className="bw-input py-1 text-xs"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">State</label>
                    <input
                      type="text"
                      value={editProfileForm.state}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, state: e.target.value })}
                      className="bw-input py-1 text-xs"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-0.5">District</label>
                    <input
                      type="text"
                      value={editProfileForm.district}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, district: e.target.value })}
                      className="bw-input py-1 text-xs"
                      placeholder="e.g. Chennai"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Aadhaar / ID Proof (Optional)</label>
                  <input
                    type="text"
                    value={editProfileForm.idProof}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, idProof: e.target.value })}
                    className="bw-input py-1 text-xs font-mono"
                    placeholder="Leave blank or enter ID"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="w-full mt-2 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-stone-400">
                <p>
                  <strong className="text-stone-200">Name:</strong>{" "}
                  <span className="text-stone-100">{personalInfo.name || "Citizen Litigant"}</span>
                </p>
                {personalInfo.email && (
                  <p>
                    <strong className="text-stone-200">Email:</strong>{" "}
                    <span className="text-stone-300 font-mono text-[11px]">{personalInfo.email}</span>
                  </p>
                )}
                {personalInfo.phone && (
                  <p>
                    <strong className="text-stone-200">Phone:</strong>{" "}
                    <span className="text-stone-300 font-mono text-[11px]">{personalInfo.phone}</span>
                  </p>
                )}
                {!personalInfo.email && !personalInfo.phone && (
                  <p>
                    <strong className="text-stone-200">Contact:</strong>{" "}
                    <span className="text-stone-500 italic">Not provided</span>
                  </p>
                )}
                <p>
                  <strong className="text-stone-200">Jurisdiction:</strong>{" "}
                  {personalInfo.district || personalInfo.state ? (
                    <span className="text-stone-300">
                      {[personalInfo.district, personalInfo.state].filter(Boolean).join(", ")}
                    </span>
                  ) : (
                    <span className="text-stone-500 italic">Not specified (Pan-India)</span>
                  )}
                </p>
                <p>
                  <strong className="text-stone-200">Aadhaar:</strong>{" "}
                  {personalInfo.idProof ? (
                    <span className="text-stone-300 font-mono text-[11px]">{personalInfo.idProof}</span>
                  ) : (
                    <span className="text-stone-500 italic">Not provided (Optional)</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Panel */}
        <main className="lg:col-span-3">
          {/* TAB 1: NEW PETITION WIZARD */}
          {activeTab === "new-petition" && (
            <div className="border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
              {/* Stepper Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#2d2621]">
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                  <span className={`px-2.5 py-1 rounded text-xs ${wizardStep === 1 ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]" : "bg-[#14110f] text-stone-500 border border-[#2d2621]"}`}>
                    1. Grievance
                  </span>
                  <span>→</span>
                  <span className={`px-2.5 py-1 rounded text-xs ${wizardStep === 2 ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]" : "bg-[#14110f] text-stone-500 border border-[#2d2621]"}`}>
                    2. Legal Checklist
                  </span>
                  <span>→</span>
                  <span className={`px-2.5 py-1 rounded text-xs ${wizardStep === 3 ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]" : "bg-[#14110f] text-stone-500 border border-[#2d2621]"}`}>
                    3. Upload & Scrutiny
                  </span>
                  <span>→</span>
                  <span className={`px-2.5 py-1 rounded text-xs ${wizardStep === 4 ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]" : "bg-[#14110f] text-stone-500 border border-[#2d2621]"}`}>
                    4. Submission
                  </span>
                </div>
              </div>

              {/* STEP 1: GRIEVANCE INTAKE */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-stone-100">Describe Your Legal Grievance</h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Explain the dispute in your own words. You can write in any regional language or record speech.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-stone-300">
                        Dispute Narrative
                      </label>
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
                            : `Click to speak grievance in ${personalInfo.language}`
                        }
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>Transcribing with Groq AI...</span>
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
                            <span>Voice Input ({personalInfo.language})</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Active Recording Notice */}
                    {isRecording && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-950/30 border border-rose-500/40 rounded text-xs text-rose-300">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        <span>Listening... Speak your grievance in {personalInfo.language}. Click <strong>Stop ({formatSeconds(recordingSeconds)})</strong> when done.</span>
                        <span className="ml-auto font-mono text-[11px] text-rose-400">Max 60s</span>
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
                      value={problemDescription}
                      onChange={(e) => {
                        setProblemDescription(e.target.value);
                        if (caseValidationError) setCaseValidationError(null);
                      }}
                      placeholder="e.g. Neighbor has constructed a masonry wall encroaching onto my agricultural plot #142 in Kothrud..."
                      className={`bw-input leading-relaxed ${
                        caseValidationError ? "border-rose-500/70 focus:border-rose-400 bg-rose-950/10" : ""
                      }`}
                    />

                    {/* Invalid Case Error Banner */}
                    {caseValidationError && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-200 text-xs leading-relaxed animate-in fade-in duration-200 shadow-sm">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1.5">
                          <p className="font-semibold text-rose-300">Invalid Case Description (Rejected)</p>
                          <p>{caseValidationError}</p>
                          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300 border-t border-rose-500/20">
                            <span className="text-stone-400 font-medium">Click to try a valid case:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setProblemDescription(
                                  "Neighbor has constructed a masonry boundary wall encroaching 3 feet onto my registered agricultural plot #142 in Kothrud, Pune without statutory consent."
                                );
                                setCaseValidationError(null);
                              }}
                              className="text-stone-300 hover:text-white underline underline-offset-2 cursor-pointer"
                            >
                              Land encroachment
                            </button>
                            <span className="text-stone-500">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setProblemDescription(
                                  "Cheque of ₹2,50,000 issued towards commercial goods supply was dishonoured by bank due to insufficient funds under Section 138 NI Act."
                                );
                                setCaseValidationError(null);
                              }}
                              className="text-stone-300 hover:text-white underline underline-offset-2 cursor-pointer"
                            >
                              Cheque bounce
                            </button>
                            <span className="text-stone-500">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setProblemDescription(
                                  "Consumer complaint against dealer for delivering defective home appliance and refusing statutory warranty repair or refund."
                                );
                                setCaseValidationError(null);
                              }}
                              className="text-stone-300 hover:text-white underline underline-offset-2 cursor-pointer"
                            >
                              Consumer defect
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-medium text-stone-300 mb-1">
                        Preferred Language
                      </label>
                      <select
                        value={personalInfo.language || "English"}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, language: e.target.value })}
                        className="bw-input"
                      >
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Telugu">Telugu</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-stone-300 mb-1">
                        District / Local Jurisdiction (Optional)
                      </label>
                      <input
                        type="text"
                        value={personalInfo.district}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, district: e.target.value })}
                        placeholder="e.g. Chennai, Coimbatore, Delhi, etc."
                        className="bw-input"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleClassify}
                      disabled={analyzingCase || !problemDescription.trim()}
                      className="bw-btn-primary px-4 py-2 text-xs font-semibold"
                    >
                      {analyzingCase ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing Statutory Rules...</span>
                        </>
                      ) : (
                        <>
                          <span>Analyze & Continue</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: STATUTORY CHECKLIST */}
              {wizardStep === 2 && classificationResult && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-stone-100">
                      Procedural Guidance & Required Annexures
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Statutory legal provisions and mandatory documents for this dispute.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-[#2d2621] bg-[#14110f] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-200">
                        Category: {classificationResult.category}
                      </span>
                      <span className="text-[11px] font-mono border border-[#3e352f] bg-[#201b17] text-stone-300 px-2 py-0.5 rounded">
                        Confidence: {classificationResult.confidence}
                      </span>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed">
                      {classificationResult.simple_explanation || classificationResult.simpleExplanation}
                    </p>

                    <div className="pt-2 flex flex-wrap gap-4 text-xs text-stone-400">
                      <div>
                        <strong className="text-stone-300">Forum:</strong> {classificationResult.suggested_court || classificationResult.suggestedCourt}
                      </div>
                      <div>
                        <strong className="text-stone-300">Timeline:</strong> {classificationResult.timeline}
                      </div>
                    </div>
                  </div>

                  {/* Applicable Statutes */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                      Applicable Statutory Sections
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {classificationResult.acts?.map((act: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded bg-[#201b17] border border-[#38302a] text-xs font-mono text-stone-300"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Required Documents */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                      Mandatory Filing Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(classificationResult.required_documents || classificationResult.documents)?.map((doc: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-[#2d2621] bg-[#14110f] flex items-center gap-2 text-xs text-stone-300"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="bw-btn-secondary px-3.5 py-2 text-xs"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className="bw-btn-primary px-4 py-2 text-xs font-semibold"
                    >
                      <span>Proceed to Upload Documents</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DOCUMENT UPLOAD & OCR SCANNING */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-stone-100">
                      Upload Petition Annexures & Document Scrutiny
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Attach certified copies of your identity proof, land revenue extract (7/12), and survey drawings.
                    </p>
                  </div>

                  {/* Document Upload Component */}
                  <DocumentUpload
                    onUploadSuccess={handleDocUploaded}
                    label="Attach Grievance Supporting Documents"
                    userId={personalInfo.name}
                  />

                  {/* List of Attached Documents */}
                  {uploadedDocs.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-semibold text-stone-300">
                        Attached Documents ({uploadedDocs.length})
                      </h4>
                      <div className="space-y-2">
                        {uploadedDocs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                              <div>
                                <p className="font-medium text-stone-200">{doc.originalName}</p>
                                <p className="text-[11px] text-stone-500 font-mono">
                                  ID: {doc.id} • {(doc.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>

                            <span className="text-[11px] bg-[#201b17] text-stone-300 border border-[#38302a] px-2 py-0.5 rounded font-mono">
                              Ready for Filing
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legal Representation Choice */}
                  <div className="pt-4 border-t border-[#2d2621] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                      Select Legal Counsel Representation
                    </h3>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRepresentationType("legal-aid")}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                          representationType === "legal-aid"
                            ? "border-[#6e5f54] bg-[#26201c] font-semibold text-stone-100"
                            : "border-[#2d2621] hover:border-[#3e352f] bg-[#14110f] text-stone-400"
                        }`}
                      >
                        <p className="font-medium">Empaneled Legal Aid</p>
                        <p className="text-[11px] text-stone-500">DLSA / NALSA Panel</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRepresentationType("private")}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                          representationType === "private"
                            ? "border-[#6e5f54] bg-[#26201c] font-semibold text-stone-100"
                            : "border-[#2d2621] hover:border-[#3e352f] bg-[#14110f] text-stone-400"
                        }`}
                      >
                        <p className="font-medium">Private Counsel</p>
                        <p className="text-[11px] text-stone-500">Bar Council Member</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRepresentationType("self")}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                          representationType === "self"
                            ? "border-[#6e5f54] bg-[#26201c] font-semibold text-stone-100"
                            : "border-[#2d2621] hover:border-[#3e352f] bg-[#14110f] text-stone-400"
                        }`}
                      >
                        <p className="font-medium">In-Person (Self)</p>
                        <p className="text-[11px] text-stone-500">Appear Pro Se</p>
                      </button>
                    </div>

                    {representationType === "legal-aid" && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-stone-300">
                          Empaneled Advocates in {personalInfo.district || "Your Jurisdiction"}:
                        </label>
                        <select
                          value={selectedCounsel || ""}
                          onChange={(e) => setSelectedCounsel(e.target.value)}
                          className="bw-input"
                        >
                          {empaneledCounsel.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.barNo}) - {c.specialization}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="bw-btn-secondary px-3.5 py-2 text-xs"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmitPetition}
                      className="bw-btn-primary px-4 py-2 text-xs font-semibold"
                    >
                      <span>Submit Petition to Court Registry</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SUBMISSION CONFIRMATION */}
              {wizardStep === 4 && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#221c18] border border-[#3e352f] text-stone-200 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-stone-300" />
                  </div>

                  <h2 className="text-xl font-bold text-stone-100">
                    Petition Transmitted to Court Registry
                  </h2>

                  <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                    Your petition has been registered for Scrutiny by the Court Registrar Clerk. The case has been indexed into the central cause ledger.
                  </p>

                  {submittedPetition && (
                    <div className="max-w-md mx-auto p-4 border border-[#2d2621] rounded-lg bg-[#14110f] text-left text-xs space-y-1.5 text-stone-300">
                      <p><strong className="text-stone-400">Tracking Number:</strong> <span className="font-mono text-stone-200">{submittedPetition.id}</span></p>
                      <p><strong className="text-stone-400">Allocated CNR:</strong> <span className="font-mono text-stone-200">{submittedPetition.cnr_number}</span></p>
                      <p><strong className="text-stone-400">Category:</strong> {submittedPetition.category}</p>
                      <p><strong className="text-stone-400">Status:</strong> <span className="text-stone-200 font-semibold">{submittedPetition.status}</span></p>
                      <p><strong className="text-stone-400">Documents Attached:</strong> {submittedPetition.documents_count}</p>
                    </div>
                  )}

                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setActiveTab("track-case");
                        setWizardStep(1);
                      }}
                      className="bw-btn-primary px-4 py-2 text-xs font-semibold"
                    >
                      View in Active Cases
                    </button>
                    <button
                      onClick={() => {
                        setWizardStep(1);
                        setProblemDescription("");
                        setClassificationResult(null);
                        setUploadedDocs([]);
                      }}
                      className="bw-btn-secondary px-3.5 py-2 text-xs"
                    >
                      File Another Grievance
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRACK REGISTERED CASES */}
          {activeTab === "track-case" && (
            <div className="space-y-6">
              {/* Live eCourts CNR Tracker */}
              <CnrTracker />

              <div className="border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
                <div>
                  <h2 className="text-base font-bold text-stone-100">My Registered Court Petitions</h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Inspect your petition status, access digital summons, or analyze grounds of appeal under CPC Section 96.
                  </p>
                </div>

                {/* Search */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter petitions by CNR, category, or grievance..."
                    className="bw-input"
                  />
                </div>

                {/* Cases Table */}
                <div className="border border-[#2d2621] rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#14110f] border-b border-[#2d2621] text-stone-400 font-semibold">
                      <tr>
                        <th className="p-3">CNR Number / ID</th>
                        <th className="p-3">Dispute Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Assigned Counsel</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26201c]">
                      {petitions
                        .filter((p) => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            (p.cnr_number || "").toLowerCase().includes(q) ||
                            (p.id || "").toLowerCase().includes(q) ||
                            (p.category || "").toLowerCase().includes(q) ||
                            (p.description || "").toLowerCase().includes(q)
                          );
                        })
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-[#1a1614] transition-colors">
                            <td className="p-3 font-mono font-medium text-stone-200">
                              {p.cnr_number || p.id}
                            </td>
                            <td className="p-3 max-w-xs truncate text-stone-300">
                              {p.description}
                            </td>
                            <td className="p-3 text-stone-400">{p.category}</td>
                            <td className="p-3 text-stone-300">{p.advocate_name || "Legal Aid"}</td>
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium border border-[#38302a] bg-[#201b17] text-stone-300">
                                {p.status || "Scrutiny Pending"}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedCaseForSummons(p)}
                                  className="px-2 py-1 rounded bg-[#241e19] hover:bg-[#322922] border border-[#403429] text-[11px] text-amber-300 font-medium transition-colors cursor-pointer"
                                  title="View Digital Summons"
                                >
                                  Summons
                                </button>
                                <button
                                  onClick={() => setSelectedCaseForAppeal(p)}
                                  className="px-2 py-1 rounded bg-[#2a221c] hover:bg-[#3a3026] border border-[#524132] text-[11px] text-stone-200 font-medium transition-colors cursor-pointer"
                                  title="Analyze Grounds of Appeal"
                                >
                                  Appeal
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENT REPOSITORY */}
          {activeTab === "documents" && (
            <div className="border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
              <div>
                <h2 className="text-base font-bold text-stone-100">Document Storage & Scan Ledger</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  All documents uploaded to the server storage disk with OCR extraction details.
                </p>
              </div>

              {/* Upload New Document Directly */}
              <DocumentUpload
                onUploadSuccess={() => loadPetitionsAndDocs()}
                label="Upload Document to Repository"
                userId={personalInfo.name}
              />

              {/* Stored Documents Table */}
              <div className="space-y-3 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Stored Files ({serverDocuments.length})
                </h3>

                {serverDocuments.length === 0 ? (
                  <div className="text-center py-8 text-stone-500 text-xs border border-dashed border-[#2d2621] rounded-lg">
                    No documents uploaded yet.
                  </div>
                ) : (
                  <div className="border border-[#2d2621] rounded-lg divide-y divide-[#26201c]">
                    {serverDocuments.map((doc, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-[#1a1614] transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-stone-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-stone-200">{doc.originalName}</p>
                            <p className="text-stone-500 font-mono text-[11px]">
                              ID: {doc.id} • {(doc.size / 1024).toFixed(1)} KB • {doc.mimeType}
                            </p>
                            {doc.scanResult?.detectedDocType && (
                              <p className="text-[11px] text-stone-400 mt-0.5">
                                Type: <strong className="text-stone-300">{doc.scanResult.detectedDocType}</strong> ({doc.scanResult.wordCount} words)
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 border border-[#3e352f] rounded-lg hover:bg-[#221c18] text-stone-300 font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-400" /> View File
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Appeal Analysis Modal */}
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

      {/* Court Summons Modal */}
      <CourtSummonsModal
        isOpen={!!selectedCaseForSummons}
        onClose={() => setSelectedCaseForSummons(null)}
        petition={selectedCaseForSummons}
      />

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow Citizen Portal • Judicial Scrutiny and Case Ledger
      </footer>
    </div>
  );
}
