"use client";

import { useState, useEffect } from "react";
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
  Trash2
} from "lucide-react";
import {
  apiClassifyCase,
  apiListPetitions,
  apiGetDocuments
} from "@/utils/api";
import DocumentUpload, { UploadedDocRecord } from "@/components/document-upload";

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
    name: "Aditya Patil",
    phone: "+91 98765 43210",
    district: "Pune",
    state: "Maharashtra",
    language: "Marathi",
    idProof: "Aadhaar: 5544-6677-8899",
  });
  const [problemDescription, setProblemDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // AI Classification State
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [analyzingCase, setAnalyzingCase] = useState(false);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.fullName) {
          setPersonalInfo((prev) => ({
            ...prev,
            name: u.fullName,
            phone: u.email || u.phone || prev.phone,
          }));
        }
      }
    } catch (e) {}
    loadPetitionsAndDocs();
  }, []);

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

  const handleVoiceInput = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setProblemDescription(
        "Neighbor constructed a masonry boundary wall encroaching into my agricultural plot #142 in Kothrud, Pune. Revenue survey drawings confirm demarcation. Urgent permanent injunction requested."
      );
    }, 1200);
  };

  const handleClassify = async () => {
    if (!problemDescription.trim()) return;
    setAnalyzingCase(true);
    try {
      const res = await apiClassifyCase(problemDescription, personalInfo.language);
      setClassificationResult(res);
      setWizardStep(2);
    } catch (err) {
      console.error("Classification error:", err);
    } finally {
      setAnalyzingCase(false);
    }
  };

  const handleDocUploaded = (doc: UploadedDocRecord) => {
    setUploadedDocs((prev) => [doc, ...prev]);
    loadPetitionsAndDocs();
  };

  const handleSubmitPetition = async () => {
    const newPetition = {
      id: "CNR-DL-2026-" + Math.floor(10000 + Math.random() * 90000),
      citizen_name: personalInfo.name,
      contact: personalInfo.phone,
      category: classificationResult?.category || "Property Dispute",
      description: problemDescription,
      status: "Scrutiny Pending",
      suggested_court: classificationResult?.suggested_court || "Sub-Divisional Magistrate Court, Pune",
      advocate_name:
        representationType === "legal-aid"
          ? empaneledCounsel.find((c) => c.id === selectedCounsel)?.name || "Legal Aid Counsel"
          : representationType === "private"
          ? privateAdvocate.name || "Private Counsel"
          : "In-Person (Self)",
      cnr_number: "DLCT01-" + Math.floor(100000 + Math.random() * 900000) + "-2026",
      documents_count: uploadedDocs.length,
      created_at: new Date().toISOString(),
    };

    setSubmittedPetition(newPetition);
    setPetitions((prev) => [newPetition, ...prev]);
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
              <p className="text-xs font-semibold text-stone-200">{personalInfo.name}</p>
              <p className="text-[11px] text-stone-400 font-mono">{personalInfo.phone.includes("@") ? personalInfo.phone : `${personalInfo.district}, ${personalInfo.state}`}</p>
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
              Litigant Profile
            </h4>
            <div className="space-y-1.5 text-xs text-stone-400">
              <p><strong className="text-stone-200">Name:</strong> {personalInfo.name}</p>
              <p><strong className="text-stone-200">Phone:</strong> {personalInfo.phone}</p>
              <p><strong className="text-stone-200">Jurisdiction:</strong> {personalInfo.district}, {personalInfo.state}</p>
              <p><strong className="text-stone-200">Aadhaar:</strong> 5544-6677-8899</p>
            </div>
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
                        disabled={isRecording}
                        className="inline-flex items-center gap-1.5 text-xs text-stone-300 hover:text-stone-100 px-2.5 py-1 rounded border border-[#3e352f] bg-[#1c1815] transition-colors"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${isRecording ? "text-stone-100 animate-pulse" : ""}`} />
                        {isRecording ? "Recording Audio..." : "Voice Input (Marathi / Hindi)"}
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      placeholder="e.g. Neighbor has constructed a masonry wall encroaching onto my agricultural plot #142 in Kothrud..."
                      className="bw-input leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-medium text-stone-300 mb-1">
                        Language
                      </label>
                      <select
                        value={personalInfo.language}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, language: e.target.value })}
                        className="bw-input"
                      >
                        <option value="Marathi">Marathi</option>
                        <option value="Hindi">Hindi</option>
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Bengali">Bengali</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-stone-300 mb-1">
                        District / Jurisdiction
                      </label>
                      <input
                        type="text"
                        value={personalInfo.district}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, district: e.target.value })}
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
                          Empaneled Advocates in {personalInfo.district}:
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
            <div className="border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
              <div>
                <h2 className="text-base font-bold text-stone-100">Track Registered Court Cases</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Inspect the live status, hearing dates, and CNR numbers for registered petitions.
                </p>
              </div>

              {/* Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by CNR number, category, or party name..."
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
                        </tr>
                      ))}
                  </tbody>
                </table>
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

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow Citizen Portal • Judicial Scrutiny and Case Ledger
      </footer>
    </div>
  );
}
