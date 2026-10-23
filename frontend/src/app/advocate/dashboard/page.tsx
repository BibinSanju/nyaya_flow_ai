"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  LogOut,
  Scale,
  RefreshCw,
  Eye,
  Shield
} from "lucide-react";
import { apiListPetitions, apiUpdatePetition } from "@/utils/api";

interface MatchRequest {
  id: string;
  litigant: string;
  category: string;
  date: string;
  summary: string;
  suggestedCourt: string;
  status: string;
}

export default function AdvocateDashboard() {
  const [selectedCaseId, setSelectedCaseId] = useState("req-01");
  const [acceptedRequests, setAcceptedRequests] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<{ fullName?: string; email?: string } | null>(null);

  const defaultRequests: MatchRequest[] = [
    {
      id: "req-01",
      litigant: "Aditya Patil",
      category: "Civil Property Dispute",
      date: "Oct 21, 2026",
      summary:
        "Claiming partition encroachment on a 7/12 mutation survey plot #142 in Kothrud, Pune. Neighbor constructed a masonry boundary wall violating survey drawings. Injunction needed under Specific Relief Act.",
      suggestedCourt: "Sub-Divisional Magistrate Court, Pune",
      status: "Awaiting Counsel Acceptance",
    },
    {
      id: "req-02",
      litigant: "Ramesh Iyer",
      category: "Consumer Contract Dispute",
      date: "Oct 19, 2026",
      summary:
        "Claim against supplier for non-delivery of agricultural machinery following deposit under Consumer Protection Act.",
      suggestedCourt: "District Consumer Disputes Redressal Commission, Pune",
      status: "Awaiting Counsel Acceptance",
    },
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}

    const loadCases = async () => {
      try {
        const raw = await apiListPetitions();
        if (Array.isArray(raw) && raw.length > 0) {
          const mapped: MatchRequest[] = raw.map((p: any) => ({
            id: p.id || p.cnr_number,
            litigant: p.citizen_name || p.petitionerName || p.petitioner || "Citizen Litigant",
            category: p.category || p.caseType || "General Civil",
            date: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Oct 21, 2026",
            summary: p.description,
            suggestedCourt: p.suggested_court || "Subordinate Court",
            status: p.status === "Scrutiny Pending" ? "Awaiting Counsel Acceptance" : p.status,
          }));
          setMatchRequests(mapped);
          setSelectedCaseId(mapped[0].id);
          return;
        }
        setMatchRequests(defaultRequests);
      } catch (err) {
        setMatchRequests(defaultRequests);
      }
    };
    loadCases();
  }, []);

  const selectedCase =
    matchRequests.find((c) => c.id === selectedCaseId) || matchRequests[0] || defaultRequests[0];
  const isAccepted = acceptedRequests.includes(selectedCase.id);

  const handleAcceptBrief = async () => {
    setActionLoading(true);

    try {
      if (selectedCase.id && !selectedCase.id.startsWith("req-")) {
        await apiUpdatePetition(selectedCase.id, {
          advocate_name: currentUser?.fullName || "Adv. Abhishek Deshmukh",
          status: "Registry Audited",
        });
      }
    } catch (e) {
      console.warn("Advocate brief acceptance error:", e);
    }

    setAcceptedRequests((prev) => [...prev, selectedCase.id]);
    setActionLoading(false);
  };

  const handleOpenChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-nyayaflow-chat"));
    }
  };

  return (
    <div className="min-h-screen text-stone-200 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#2d2621] sticky top-0 bg-[#12100e]/95 backdrop-blur-md z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded border border-[#3e352f] bg-[#221c18] text-stone-200 flex items-center justify-center font-semibold">
                <Briefcase className="w-4 h-4 text-stone-300" />
              </div>
              <span className="font-semibold text-base text-stone-100 tracking-tight">NyayaFlow</span>
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-xs font-medium text-stone-400 hidden sm:inline">Advocate Counsel Workspace</span>
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
                  ? (currentUser.fullName.toLowerCase().startsWith("adv.") ? currentUser.fullName : `Adv. ${currentUser.fullName}`)
                  : "Adv. Abhishek Deshmukh"}
              </p>
              <p className="text-[11px] text-stone-400 font-mono">
                {currentUser?.email || "BCI/MAH/4921-2015"}
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

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#3e352f] bg-[#201b17] text-[11px] font-medium text-stone-300 mb-2">
            <Scale className="w-3 h-3 text-stone-400" />
            <span>Advocate Docket & Case Management</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Client Representation & Docket Briefs</h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Review incoming litigant requests, verify document annexures, and confirm vakalatnama representation.
          </p>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incoming Briefs List */}
          <div className="border border-[#2e2722] rounded-xl p-5 bg-[#181513]/95 backdrop-blur-md space-y-3 shadow-xl shadow-black/40">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
              Pending Litigant Inquiries ({matchRequests.length})
            </h2>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {matchRequests.map((req) => {
                const isSelected = req.id === selectedCase.id;
                const reqAccepted = acceptedRequests.includes(req.id);
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedCaseId(req.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[#6e5f54] bg-[#26201c] text-stone-100 font-semibold ring-1 ring-[#6e5f54]/40"
                        : "border-[#2d2621] hover:border-[#443a33] bg-[#14110f] text-stone-300 hover:text-stone-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-200">{req.litigant}</span>
                      <span className="text-[11px] text-stone-500">{req.date}</span>
                    </div>
                    <p className="text-stone-400 mt-1 line-clamp-1">{req.category}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-stone-500">ID: {req.id}</span>
                      {reqAccepted && (
                        <span className="text-[10px] text-stone-300 bg-[#221c18] border border-[#3e352f] px-2 py-0.5 rounded font-medium">
                          Vakalatnama Filed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Brief Dossier Detail */}
          <div className="lg:col-span-2 border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
            <div className="flex items-start justify-between border-b border-[#2d2621] pb-4">
              <div>
                <span className="text-[11px] font-mono text-stone-400 bg-[#1c1815] border border-[#2d2621] px-2 py-0.5 rounded">
                  {selectedCase.id}
                </span>
                <h2 className="text-base font-bold text-stone-100 mt-2">
                  {selectedCase.litigant} — {selectedCase.category}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Target Court: {selectedCase.suggestedCourt}
                </p>
              </div>

              {isAccepted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-[#221c18] text-stone-300 border border-[#3e352f]">
                  <CheckCircle className="w-3.5 h-3.5 text-stone-400" /> Representation Accepted
                </span>
              ) : (
                <button
                  onClick={handleAcceptBrief}
                  disabled={actionLoading}
                  className="bw-btn-primary px-4 py-2 text-xs font-semibold"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Filing Authorization...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Accept Vakalatnama Brief</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Narrative */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Litigant Grievance Narrative
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 bg-[#12100e] p-4 rounded-lg border border-[#2d2621] leading-relaxed">
                {selectedCase.summary}
              </p>
            </div>

            {/* Required Annexures Checklist */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Counsel Verification Checklist
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-300">Aadhaar Identity Verification</span>
                </div>
                <div className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-300">7/12 Land Mutation Record</span>
                </div>
                <div className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-300">Revenue Survey Map & Injunction Plaint</span>
                </div>
                <div className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-300">Signed Vakalatnama Form (Rule 4 BCI)</span>
                </div>
              </div>
            </div>

            {/* Scrutiny Compliance */}
            <div className="p-4 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-stone-200">Registry Scrutiny Status</p>
                <p className="text-stone-400 mt-0.5">Document verification benchmark 85% compliant.</p>
              </div>
              <Link
                href="/citizen/dashboard"
                className="bw-btn-secondary py-1.5 px-3 text-xs"
              >
                Inspect Attached Documents
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow Advocate Workspace • Bar Council of India Compliance
      </footer>
    </div>
  );
}
