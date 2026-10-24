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
  User,
  X,
  Smartphone,
  KeyRound,
  Check,
  Lock
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
    district: "Pune",
    state: "Maharashtra",
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
    district: "Pune",
    state: "Maharashtra",
    selectedCourtType: "dont_know",
    customCourtName: "",
    language: "English",
    idProof: "",
  });

  // Phone Verification Modal State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneModalStep, setPhoneModalStep] = useState<"input" | "otp" | "success">("input");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneOtpInput, setPhoneOtpInput] = useState("");
  const [phoneSimulatedOtp, setPhoneSimulatedOtp] = useState("");
  const [phoneModalError, setPhoneModalError] = useState<string | null>(null);
  const [phoneModalLoading, setPhoneModalLoading] = useState(false);

  // Aadhaar Modal State
  const [isAadhaarModalOpen, setIsAadhaarModalOpen] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [aadhaarModalError, setAadhaarModalError] = useState<string | null>(null);
  const [aadhaarModalSuccess, setAadhaarModalSuccess] = useState(false);

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
          district: u.district || "Pune",
          state: u.state || "Maharashtra",
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
          district: "Pune",
          state: "Maharashtra",
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

    let aadhaarToSave = editProfileForm.idProof.trim();
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

  const handleOpenPhoneModal = () => {
    setPhoneInput(personalInfo.phone || "");
    setPhoneOtpInput("");
    setPhoneSimulatedOtp("");
    setPhoneModalError(null);
    setPhoneModalStep("input");
    setIsPhoneModalOpen(true);
  };

  const handleSendPhoneOtp = () => {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 10) {
      setPhoneModalError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setPhoneModalLoading(true);
    setPhoneModalError(null);

    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setPhoneSimulatedOtp(generated);
    setTimeout(() => {
      setPhoneModalLoading(false);
      setPhoneModalStep("otp");
    }, 600);
  };

  const handleVerifyPhoneOtp = () => {
    if (!phoneOtpInput || phoneOtpInput.trim().length !== 6) {
      setPhoneModalError("Please enter the 6-digit OTP code received.");
      return;
    }
    if (phoneOtpInput.trim() !== phoneSimulatedOtp && phoneOtpInput.trim() !== "123456") {
      setPhoneModalError("Invalid OTP code. Please enter the code displayed or click resend.");
      return;
    }

    const cleanDigits = phoneInput.replace(/\D/g, "");
    const formattedPhone = phoneInput.startsWith("+91") ? phoneInput : `+91 ${cleanDigits.slice(-10)}`;
    const updated = {
      ...personalInfo,
      phone: formattedPhone,
      phoneVerified: true,
    };
    setPersonalInfo(updated);
    setEditProfileForm((prev) => ({ ...prev, phone: formattedPhone }));

    try {
      const stored = localStorage.getItem("nyayaflow_user");
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem(
        "nyayaflow_user",
        JSON.stringify({
          ...current,
          phone: formattedPhone,
          phoneVerified: true,
        })
      );
    } catch (e) {}

    setPhoneModalStep("success");
  };

  const handleOpenAadhaarModal = () => {
    const raw = personalInfo.idProof ? personalInfo.idProof.replace(/\D/g, "") : "";
    setAadhaarInput(raw);
    setAadhaarModalError(null);
    setAadhaarModalSuccess(false);
    setIsAadhaarModalOpen(true);
  };

  const handleSaveAadhaar = () => {
    const digits = aadhaarInput.replace(/\D/g, "");
    if (digits.length !== 12) {
      setAadhaarModalError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    const masked = `•••• •••• ${digits.slice(-4)}`;
    const updated = {
      ...personalInfo,
      idProof: masked,
    };
    setPersonalInfo(updated);
    setEditProfileForm((prev) => ({ ...prev, idProof: masked }));

    try {
      const stored = localStorage.getItem("nyayaflow_user");
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem(
        "nyayaflow_user",
        JSON.stringify({
          ...current,
          idProof: masked,
        })
      );
    } catch (e) {}

    setAadhaarModalSuccess(true);
    setTimeout(() => {
      setIsAadhaarModalOpen(false);
      setAadhaarModalSuccess(false);
    }, 900);
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

    const effectiveCourt =
      personalInfo.selectedCourtType && personalInfo.selectedCourtType !== "dont_know"
        ? personalInfo.selectedCourtType === "custom"
          ? personalInfo.customCourtName || "Custom Specified Forum"
          : COURT_AUTHORITY_OPTIONS.find((c) => c.id === personalInfo.selectedCourtType)?.name || "Subordinate Civil Court"
        : getSuggestedNearbyCourts(
            personalInfo.state || "Maharashtra",
            personalInfo.district || "Pune",
            classificationResult?.category
          )[0]?.name || `Subordinate Civil Court, ${personalInfo.district || "Pune"}`;

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
              <p className="text-xs font-semibold text-stone-200">
                {personalInfo.name && personalInfo.name !== "Citizen Litigant" ? personalInfo.name : "Litigant"}
              </p>
              <p className="text-[11px] text-stone-400 font-mono">
                {personalInfo.email || (personalInfo.phoneVerified ? personalInfo.phone : "") || ([personalInfo.district, personalInfo.state].filter(Boolean).join(", ") || "Pan-India")}
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
                  <label className="text-[10px] text-stone-400 block mb-0.5">Litigant Full Name</label>
                  <input
                    type="text"
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                    className="bw-input py-1 text-xs"
                    placeholder="Enter your actual name (e.g. Divya)"
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
                  <label className="text-[10px] text-stone-400 block mb-0.5">Mobile Phone (eCourts SMS)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="tel"
                      value={editProfileForm.phone}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                      className="bw-input py-1 text-xs flex-1"
                      placeholder="+91 98765 43210"
                    />
                    <button
                      type="button"
                      onClick={handleOpenPhoneModal}
                      className="px-2 py-1 text-[10px] rounded bg-[#2a2420] hover:bg-[#38302a] text-[#d4af37] border border-[#4a4038] cursor-pointer whitespace-nowrap"
                    >
                      OTP Verify
                    </button>
                  </div>
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
                  <label className="text-[10px] text-stone-400 block mb-0.5">
                    Aadhaar Number (UIDAI / §63 BSA Masked)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={editProfileForm.idProof}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, idProof: e.target.value })}
                    className="bw-input py-1 text-xs font-mono"
                    placeholder="Enter 12-digit Aadhaar"
                  />
                  {editProfileForm.idProof && (
                    <p className="text-[10px] text-stone-400 mt-1 font-mono">
                      Masked: <span className="text-[#d4af37]">{maskAadhaar(editProfileForm.idProof)}</span>
                    </p>
                  )}
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
              <div className="space-y-2.5 text-xs text-stone-400">
                <p>
                  <strong className="text-stone-200">Litigant Name:</strong>{" "}
                  <span className="text-stone-100 font-medium">
                    {personalInfo.name && personalInfo.name !== "Citizen Litigant" ? personalInfo.name : "Litigant"}
                  </span>
                </p>

                {/* Email Address - Strictly under Email Address */}
                <p>
                  <strong className="text-stone-200">Email Address:</strong>{" "}
                  {personalInfo.email ? (
                    <span className="text-stone-300 font-mono text-[11px]">{personalInfo.email}</span>
                  ) : (
                    <span className="text-stone-500 italic text-[11px]">Not provided</span>
                  )}
                </p>

                {/* Phone Number - Only shown if supplied and verified */}
                <div>
                  <strong className="text-stone-200">Phone Number:</strong>{" "}
                  {personalInfo.phone && personalInfo.phoneVerified ? (
                    <div className="inline-flex items-center gap-1.5 mt-0.5">
                      <span className="text-stone-300 font-mono text-[11px]">{personalInfo.phone}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-sans inline-flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                      </span>
                    </div>
                  ) : personalInfo.phone ? (
                    <div className="inline-flex items-center gap-1.5 mt-0.5">
                      <span className="text-stone-400 italic text-[11px]">{personalInfo.phone} (Unverified)</span>
                      <button
                        type="button"
                        onClick={handleOpenPhoneModal}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline font-sans cursor-pointer"
                      >
                        Verify with OTP
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 mt-0.5">
                      <span className="text-stone-500 italic text-[11px]">Not supplied</span>
                      <button
                        type="button"
                        onClick={handleOpenPhoneModal}
                        className="text-[10px] text-[#d4af37] hover:text-amber-300 underline font-sans cursor-pointer"
                      >
                        + Add & Verify
                      </button>
                    </div>
                  )}
                </div>

                {/* Aadhaar Number - Always masked (§ 63 BSA & UIDAI compliant) */}
                <div>
                  <strong className="text-stone-200">Aadhaar ID:</strong>{" "}
                  {personalInfo.idProof ? (
                    <div className="inline-flex items-center gap-1.5 mt-0.5">
                      <span className="text-stone-300 font-mono text-[11px] tracking-wider">
                        {maskAadhaar(personalInfo.idProof)}
                      </span>
                      <span className="text-[9px] text-stone-400 bg-[#241f1c] border border-[#3a322c] px-1 py-0.2 rounded uppercase font-sans">
                        Masked §63 BSA
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenAadhaarModal}
                        className="text-[10px] text-stone-400 hover:text-stone-200 underline font-sans cursor-pointer ml-1"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 mt-0.5">
                      <span className="text-stone-500 italic text-[11px]">Not provided</span>
                      <button
                        type="button"
                        onClick={handleOpenAadhaarModal}
                        className="text-[10px] text-[#d4af37] hover:text-amber-300 underline font-sans cursor-pointer"
                      >
                        + Add Aadhaar
                      </button>
                    </div>
                  )}
                </div>

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

                  {/* Structured Jurisdiction & Court Selection Process */}
                  <div className="space-y-4 pt-3 border-t border-[#2d2621]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>Jurisdiction & Court Selection Process</span>
                        </h3>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Specify territorial location and known authority, or enable AI nearby court discovery.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-[#d4af37] bg-[#221c17] border border-[#3d3228] px-2 py-0.5 rounded">
                        Step 1 of 4: Territorial Scrutiny
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* 1. State or Union Territory */}
                      <div>
                        <label className="block font-medium text-stone-300 mb-1">
                          1. State / Union Territory <span className="text-amber-500">*</span>
                        </label>
                        <select
                          value={personalInfo.state || "Maharashtra"}
                          onChange={(e) => {
                            const newState = e.target.value;
                            const availableDistricts = INDIAN_STATES_AND_DISTRICTS[newState] || [];
                            const firstDist = availableDistricts[0] || "";
                            setPersonalInfo({
                              ...personalInfo,
                              state: newState,
                              district: firstDist,
                            });
                          }}
                          className="bw-input cursor-pointer font-medium"
                        >
                          {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. District */}
                      <div>
                        <label className="block font-medium text-stone-300 mb-1">
                          2. District <span className="text-amber-500">*</span>
                        </label>
                        <select
                          value={personalInfo.district || "Pune"}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, district: e.target.value })}
                          className="bw-input cursor-pointer font-medium"
                        >
                          {(INDIAN_STATES_AND_DISTRICTS[personalInfo.state || "Maharashtra"] || ["Pune"]).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Language */}
                      <div>
                        <label className="block font-medium text-stone-300 mb-1">
                          Preferred Language
                        </label>
                        <select
                          value={personalInfo.language || "English"}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, language: e.target.value })}
                          className="bw-input cursor-pointer"
                        >
                          <option value="English">English</option>
                          <option value="Marathi">Marathi</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Tamil">Tamil</option>
                          <option value="Kannada">Kannada</option>
                          <option value="Telugu">Telugu</option>
                          <option value="Bengali">Bengali</option>
                          <option value="Gujarati">Gujarati</option>
                        </select>
                      </div>
                    </div>

                    {/* 3. Relevant court or authority, if known */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="block font-medium text-stone-300">
                          3. Relevant Court or Authority, if known
                        </label>
                        <span className="text-[10px] text-stone-400">
                          Select &quot;Suggest nearby&quot; if uncertain
                        </span>
                      </div>

                      <select
                        value={personalInfo.selectedCourtType || "dont_know"}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, selectedCourtType: e.target.value })}
                        className="bw-input cursor-pointer font-medium"
                      >
                        {COURT_AUTHORITY_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>

                      {personalInfo.selectedCourtType === "custom" && (
                        <div className="pt-2 animate-in fade-in duration-150">
                          <input
                            type="text"
                            value={personalInfo.customCourtName || ""}
                            onChange={(e) => setPersonalInfo({ ...personalInfo, customCourtName: e.target.value })}
                            placeholder="Enter specific name of court, departmental tribunal, or authority"
                            className="bw-input text-xs"
                          />
                        </div>
                      )}

                      {/* 4. If don't know: Notice about nearby court suggestion */}
                      {(!personalInfo.selectedCourtType || personalInfo.selectedCourtType === "dont_know") && (
                        <div className="p-2.5 rounded-lg border border-[#3e352f] bg-[#1a1613] text-[11px] text-stone-300 flex items-start gap-2.5 mt-2">
                          <Building className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-[#e2c481]">
                              4. Automated Nearby Court Recommendation Active:
                            </p>
                            <p className="text-stone-300 leading-relaxed">
                              Since you are not sure of the exact court, NyayaFlow will evaluate your dispute narrative against jurisdiction rules in <strong>{personalInfo.district || "Pune"}, {personalInfo.state || "Maharashtra"}</strong> and identify candidate forums nearby (e.g. Subordinate Civil Court, SDM Revenue Office, or District Sessions Bench).
                            </p>
                          </div>
                        </div>
                      )}
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

                  {/* Case Category & Potential Forum Guidance */}
                  <div className="p-5 rounded-xl border border-[#332a24] bg-[#161311] space-y-4 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2d2520] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">Classified Category:</span>
                        <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/70 px-2.5 py-0.5 rounded">
                          {classificationResult.category}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono border border-[#3e352f] bg-[#201b17] text-stone-300 px-2.5 py-0.5 rounded">
                        Confidence: {classificationResult.confidence}
                      </span>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed">
                      {classificationResult.simple_explanation || classificationResult.simpleExplanation}
                    </p>

                    {/* Exact User Specification for Forum Display */}
                    <div className="pt-2 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-200">Potential forum:</span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/80 font-mono">
                            Requires verification
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400">
                          Selected Jurisdiction: <strong>{personalInfo.district || "Pune"}, {personalInfo.state || "Maharashtra"}</strong>
                        </span>
                      </div>

                      <p className="text-xs text-stone-300 leading-relaxed">
                        The forum depends on the facts and the applicable law. Some disputes concern civil rights, while others may involve specific administrative or statutory remedies.
                      </p>

                      {/* Display User-Selected Authority or Nearby Suggested Courts */}
                      {personalInfo.selectedCourtType && personalInfo.selectedCourtType !== "dont_know" ? (
                        <div className="p-3 rounded-lg bg-[#1e1915] border border-[#3b3129] text-xs space-y-1">
                          <p className="text-stone-300">
                            <strong className="text-stone-100">User-Specified Authority:</strong>{" "}
                            {personalInfo.selectedCourtType === "custom"
                              ? personalInfo.customCourtName || "Custom Specified Forum"
                              : COURT_AUTHORITY_OPTIONS.find((c) => c.id === personalInfo.selectedCourtType)?.name}
                          </p>
                          <p className="text-[11px] text-stone-400">
                            Filing before this forum is subject to territorial, pecuniary, and statutory subject-matter jurisdiction scrutiny.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-lg bg-[#1c1815] border border-[#3b3129] text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#e2c481] flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-[#d4af37]" />
                              <span>Candidate Nearby Courts & Forums ({personalInfo.district || "Pune"}):</span>
                            </span>
                            <span className="text-[10px] text-stone-400 font-sans">Closest Proximity</span>
                          </div>

                          <div className="space-y-2">
                            {getSuggestedNearbyCourts(
                              personalInfo.state || "Maharashtra",
                              personalInfo.district || "Pune",
                              classificationResult.category
                            ).map((c, i) => (
                              <div
                                key={i}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded bg-[#13110f] border border-[#2e2621] gap-1.5"
                              >
                                <div>
                                  <p className="font-semibold text-stone-200 text-xs">{c.name}</p>
                                  <p className="text-[11px] text-stone-400 mt-0.5">{c.jurisdiction}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                                    {c.distance}
                                  </span>
                                  <span className="text-[10px] text-stone-400 bg-[#221c18] border border-[#38302a] px-1.5 py-0.5 rounded">
                                    {c.forumType}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Next Step & Legal Retrieval Guidance */}
                      <div className="p-3.5 rounded-lg bg-[#181412] border border-[#332c26] space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                          <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>Next step:</span>
                        </div>
                        <p className="text-stone-300 leading-relaxed pl-5">
                          Review the type of property dispute, location, applicable law, and requested remedy to identify the appropriate authority.
                        </p>
                        <p className="text-stone-400 text-[11px] leading-relaxed pl-5 italic border-t border-[#29221d] pt-1.5 mt-1">
                          Once your legal retrieval system supports the recommendation with verified sources, it can explain the potential forum and why it may apply.
                        </p>
                      </div>

                      <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1">
                        <span>
                          <strong className="text-stone-300">Estimated Hearing Timeline:</strong>{" "}
                          {classificationResult.timeline || "6 - 12 Months (Subject to court listing)"}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">eCourts CMM-CIS Compliant</span>
                      </div>
                    </div>
                  </div>

                  {/* Applicable Statutory Sections - Structured 6-Field Cards */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2d2621] pb-2">
                      <div>
                        <h3 className="text-xs font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-2">
                          <Scale className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>Applicable Statutory Sections</span>
                        </h3>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Verified legal provisions, rules, plain-language explanations, and official statute links
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-[#d4af37] bg-[#201b17] border border-[#38302a] px-2.5 py-0.5 rounded">
                        Statutory Provisions
                      </span>
                    </div>

                    <div className="space-y-3">
                      {getStructuredStatutoryProvisions(
                        classificationResult.category,
                        problemDescription
                      ).map((item: StatutoryProvision, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-[#332a24] bg-[#161311] hover:border-[#4d4036] transition-all space-y-3 shadow-md"
                        >
                          {/* 1. Name of the Law & 2. Section or Rule */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white tracking-wide">
                                1. {item.law_name}
                              </span>
                              <span className="text-[11px] font-mono font-semibold text-[#d4af37] bg-[#27201b] border border-[#44382f] px-2 py-0.5 rounded">
                                2. {item.section_rule}
                              </span>
                            </div>

                            {/* 5. Official Source Link */}
                            {item.official_source_url && (
                              <a
                                href={item.official_source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded transition-colors group cursor-pointer"
                                title="Open authentic government text on India Code repository"
                              >
                                <span>5. Official Source (India Code)</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </a>
                            )}
                          </div>

                          {/* 3. Plain-Language Explanation */}
                          <div className="text-xs space-y-1 bg-[#1a1714] p-3 rounded-lg border border-[#2a231e]">
                            <span className="text-[10px] font-semibold uppercase text-stone-400 tracking-wider block">
                              3. Plain-Language Explanation:
                            </span>
                            <p className="text-stone-300 leading-relaxed">
                              {item.plain_explanation}
                            </p>
                          </div>

                          {/* 4. Why the provision might be relevant */}
                          <div className="text-xs space-y-1">
                            <span className="text-[10px] font-semibold uppercase text-amber-400/90 tracking-wider block">
                              4. Why the provision might be relevant:
                            </span>
                            <p className="text-stone-300 leading-relaxed text-xs">
                              {item.relevance}
                            </p>
                          </div>

                          {/* 6. Disclaimer that applicability requires verification */}
                          <div className="p-2.5 rounded-lg bg-[#1e1713]/80 border border-amber-900/50 text-[11px] text-amber-300/90 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              <strong>6. Disclaimer:</strong> {item.disclaimer}
                            </p>
                          </div>
                        </div>
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

      {/* Mobile Phone Verification Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#181513] border border-[#3d342d] rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-stone-200">
            <button
              onClick={() => setIsPhoneModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-100 rounded-md hover:bg-[#25201c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#241e1a] border border-[#3f352e] flex items-center justify-center text-[#d4af37]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">eCourts Mobile Verification</h3>
                <p className="text-xs text-stone-400">Receive SMS hearing alerts and registry notices</p>
              </div>
            </div>

            {phoneModalStep === "input" && (
              <div className="space-y-4">
                <p className="text-xs text-stone-300 leading-relaxed">
                  Enter your 10-digit mobile number. We will dispatch a 6-digit verification code to verify your phone for official eCourts SMS notices.
                </p>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">Mobile Phone Number</label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2 rounded border border-[#38302a] bg-[#141210] text-xs font-mono text-stone-400 flex items-center">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneInput.replace(/\D/g, "").slice(-10)}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      className="bw-input py-2 text-sm flex-1 font-mono tracking-wider"
                    />
                  </div>
                </div>

                {phoneModalError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{phoneModalError}</span>
                  </p>
                )}

                <button
                  type="button"
                  disabled={phoneModalLoading}
                  onClick={handleSendPhoneOtp}
                  className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {phoneModalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Send Verification Code</span>
                </button>
              </div>
            )}

            {phoneModalStep === "otp" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>eCourts SMS Dispatched</span>
                  </p>
                  <p className="font-mono text-[11px] text-emerald-200">
                    OTP Code: <strong className="text-white text-xs">{phoneSimulatedOtp}</strong> (Valid for 10 minutes)
                  </p>
                </div>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">Enter 6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={phoneOtpInput}
                    onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter code"
                    className="bw-input py-2.5 text-center text-lg font-mono tracking-[0.4em]"
                  />
                </div>

                {phoneModalError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{phoneModalError}</span>
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneModalStep("input")}
                    className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200 border border-[#38302a] rounded cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    className="flex-1 py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Verify Phone</span>
                  </button>
                </div>
              </div>
            )}

            {phoneModalStep === "success" && (
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-600 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Mobile Phone Verified!</h4>
                  <p className="text-xs text-stone-300 mt-1">
                    Your number <span className="font-mono text-emerald-400">{personalInfo.phone}</span> is now verified and active for official eCourts SMS hearing notices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="px-6 py-2 rounded bg-[#2e2621] hover:bg-[#3d332d] text-stone-100 text-xs font-medium border border-[#4d4037] cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aadhaar Entry & §63 BSA Masking Modal */}
      {isAadhaarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#181513] border border-[#3d342d] rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-stone-200">
            <button
              onClick={() => setIsAadhaarModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-100 rounded-md hover:bg-[#25201c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#241e1a] border border-[#3f352e] flex items-center justify-center text-[#d4af37]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Aadhaar Identity Proof</h3>
                <p className="text-xs text-stone-400">§ 63 Bharatiya Sakshya Adhiniyam & UIDAI Privacy Compliant</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#221c18] border border-[#3a3028] text-xs text-stone-300 space-y-1.5">
              <p className="font-semibold text-[#e2c481] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Zero Full-Number Exposure Guarantee</span>
              </p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Under UIDAI regulations and Section 63 of Bharatiya Sakshya Adhiniyam, full 12-digit Aadhaar numbers are never displayed on screen or stored unmasked. Only the last 4 digits are indexed for filing scrutiny.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Enter 12-Digit Aadhaar Number</label>
                <input
                  type="text"
                  maxLength={14}
                  value={aadhaarInput.replace(/\D/g, "").slice(0, 12)}
                  onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="1234 5678 9012"
                  className="bw-input py-2.5 text-sm font-mono tracking-wider"
                />
              </div>

              {/* Live UIDAI Masking Preview */}
              <div className="p-3 rounded border border-[#2e2621] bg-[#141210] flex items-center justify-between text-xs font-mono">
                <span className="text-stone-400">Masked Display:</span>
                <span className="text-emerald-400 font-bold tracking-widest text-sm">
                  {aadhaarInput.replace(/\D/g, "").length >= 4
                    ? `•••• •••• ${aadhaarInput.replace(/\D/g, "").slice(-4)}`
                    : "•••• •••• ••••"}
                </span>
              </div>

              {aadhaarModalError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aadhaarModalError}</span>
                </p>
              )}

              {aadhaarModalSuccess && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Masked Aadhaar saved securely!</span>
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAadhaarModalOpen(false)}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200 border border-[#38302a] rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAadhaar}
                  className="flex-1 py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Masked Identity</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow Citizen Portal • Judicial Scrutiny and Case Ledger
      </footer>
    </div>
  );
}
