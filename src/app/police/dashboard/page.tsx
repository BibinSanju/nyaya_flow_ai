"use client";

import { useState, useEffect } from "react";
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
  Upload
} from "lucide-react";
import { apiSuggestBns } from "@/utils/api";
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
    if (!incidentText.trim()) return;
    setAnalyzingBns(true);
    try {
      const res = await apiSuggestBns(incidentText);
      if (res.success && res.suggestions) {
        setBnsSuggestions(res.suggestions);
      }
    } catch (err) {
      console.error(err);
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
              <label className="text-xs font-medium text-stone-300">Incident Narrative</label>
              <textarea
                rows={5}
                value={incidentText}
                onChange={(e) => setIncidentText(e.target.value)}
                placeholder="e.g. Accused broke the padlock of complainant's shop after 11 PM and stole cash register contents..."
                className="bw-input leading-relaxed"
              />
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
