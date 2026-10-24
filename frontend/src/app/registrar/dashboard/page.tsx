"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  Check,
  ArrowRight,
  LogOut,
  Archive,
  Scale,
  RefreshCw,
  FileBadge
} from "lucide-react";
import { apiListPetitions, apiUpdatePetition } from "@/utils/api";
import CourtSummonsModal from "@/components/court-summons-modal";

interface PetitionCase {
  id: string;
  applicant: string;
  type: string;
  date: string;
  summary: string;
  suggestedCourt: string;
  status: string;
  cnrNumber: string | null;
  documents: { name: string; type: string }[];
}

export default function RegistrarDashboard() {
  const [selectedCaseId, setSelectedCaseId] = useState("default-petition-001");
  const [officialCnr, setOfficialCnr] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cases, setCases] = useState<PetitionCase[]>([]);
  const [isSummonsOpen, setIsSummonsOpen] = useState(false);

  const [archiveForm, setArchiveForm] = useState({
    building: "Court Complex A",
    floor: "2nd Floor",
    room: "Record Room B",
    rack: "Rack-04",
    shelf: "Shelf-C",
    box: "Box-102",
  });

  const defaultCases: PetitionCase[] = [
    {
      id: "default-petition-001",
      applicant: "Aditya Patil (Adv. Abhishek Deshmukh)",
      type: "Civil Property Dispute",
      date: "Oct 21, 2026",
      summary: "Partition boundary dispute on agricultural survey plot #142 in Kothrud, Pune. Survey drawings attached.",
      suggestedCourt: "Sub-Divisional Magistrate Court, Pune",
      status: "Scrutiny Pending",
      cnrNumber: null,
      documents: [
        { name: "Petition Memo.pdf", type: "Pleading" },
        { name: "7/12 Extract Mutation.pdf", type: "Revenue Extract" },
        { name: "Boundary Survey Map.png", type: "Annexure" }
      ],
    },
  ];

  const [currentUser, setCurrentUser] = useState<{ fullName?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}

    const load = async () => {
      try {
        const raw = await apiListPetitions();
        if (Array.isArray(raw) && raw.length > 0) {
          const mapped: PetitionCase[] = raw.map((p: any) => ({
            id: p.id || p.cnr_number,
            applicant: p.citizen_name ? `${p.citizen_name}${p.advocate_name ? ` (${p.advocate_name})` : ""}` : "Aditya Patil",
            type: p.category || "Property Dispute",
            date: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Oct 21, 2026",
            summary: p.description,
            suggestedCourt: p.suggested_court || "Subordinate Court",
            status: p.status || "Scrutiny Pending",
            cnrNumber: p.cnr_number || null,
            documents: [
              { name: "Litigant Petition Memo.pdf", type: "Pleading" },
              { name: "7/12 Revenue Extract.pdf", type: "Revenue Proof" },
              { name: "Survey Boundary Map.png", type: "Annexure" },
            ],
          }));
          setCases(mapped);
          setSelectedCaseId(mapped[0].id);
          return;
        }
        setCases(defaultCases);
      } catch (err) {
        setCases(defaultCases);
      }
    };
    load();
  }, []);

  const selectedCase =
    cases.find((c) => c.id === selectedCaseId) || cases[0] || defaultCases[0];

  const handleIssueCNR = async () => {
    if (!officialCnr.trim()) return;
    setActionLoading(true);

    try {
      if (selectedCase.id && !selectedCase.id.startsWith("default-")) {
        await apiUpdatePetition(selectedCase.id, {
          cnr_number: officialCnr.trim(),
          status: "CNR Issued",
        });
      }
    } catch (e) {
      console.warn("Update petition failed:", e);
    }

    const updated = cases.map((c) =>
      c.id === selectedCase.id
        ? { ...c, status: "CNR Issued", cnrNumber: officialCnr.trim() }
        : c
    );
    setCases(updated);
    setSuccessMessage(`Official CNR "${officialCnr}" assigned. Case scheduled into Cause Ledger.`);
    setOfficialCnr("");
    setActionLoading(false);
  };

  const handleAutoFillCnr = () => {
    setOfficialCnr("MHPU01-" + Math.floor(100000 + Math.random() * 900000) + "-2026");
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
                <Building2 className="w-4 h-4 text-stone-300" />
              </div>
              <span className="font-semibold text-base text-stone-100 tracking-tight">NyayaFlow</span>
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-xs font-medium text-stone-400 hidden sm:inline">Court Registrar Scrutiny Workspace</span>
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
                  ? (currentUser.fullName.toLowerCase().includes("registrar") ? currentUser.fullName : `Registrar ${currentUser.fullName}`)
                  : "Registrar Clerk"}
              </p>
              <p className="text-[11px] text-stone-400 font-mono">{currentUser?.email || "REG-44912-DL"}</p>
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
            <Building2 className="w-3 h-3 text-stone-400" />
            <span>OCR Verification & CNR Allocation</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Court Scrutiny & CNR Assignment Ledger</h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Audit petitions for procedural compliance, issue official Case Number Record (CNR) codes, and log physical record storage.
          </p>
        </div>

        {successMessage && (
          <div className="bw-callout-success">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Petitions Queue */}
          <div className="border border-[#2e2722] rounded-xl p-5 bg-[#181513]/95 backdrop-blur-md space-y-3 shadow-xl shadow-black/40">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
              Incoming Filing Filings ({cases.length})
            </h2>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {cases.map((c) => {
                const isSelected = c.id === selectedCase.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[#6e5f54] bg-[#26201c] text-stone-100 font-semibold ring-1 ring-[#6e5f54]/40"
                        : "border-[#2d2621] hover:border-[#443a33] bg-[#14110f] text-stone-300 hover:text-stone-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-200">{c.id}</span>
                      <span className="text-[11px] text-stone-500">{c.date}</span>
                    </div>
                    <p className="text-stone-300 mt-1 line-clamp-1">{c.applicant}</p>
                    <p className="text-[11px] text-stone-500 mt-1">{c.type}</p>
                    <div className="mt-2">
                      <span className="text-[10px] bg-[#1c1815] border border-[#2d2621] text-stone-400 px-2 py-0.5 rounded font-mono">
                        {c.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrutiny Details & CNR Assignment */}
          <div className="lg:col-span-2 border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
            <div className="flex items-start justify-between border-b border-[#2d2621] pb-4">
              <div>
                <span className="text-[11px] font-mono text-stone-400 bg-[#1c1815] border border-[#2d2621] px-2 py-0.5 rounded">
                  {selectedCase.id}
                </span>
                <h2 className="text-base font-bold text-stone-100 mt-2">
                  {selectedCase.applicant}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Filing Category: {selectedCase.type} • Court: {selectedCase.suggestedCourt}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {selectedCase.cnrNumber ? (
                  <span className="px-3 py-1 rounded text-xs font-mono font-medium bg-[#221c18] text-stone-200 border border-[#3e352f]">
                    CNR: {selectedCase.cnrNumber}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-xs font-medium bg-[#201b17] text-stone-400 border border-[#332c28]">
                    Awaiting Registrar Sign-off
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsSummonsOpen(true)}
                  className="px-2.5 py-1 rounded bg-[#241e19] hover:bg-[#322922] border border-[#4a3d31] text-[11px] text-amber-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileBadge className="w-3 h-3" />
                  <span>Issue Digital Summons</span>
                </button>
              </div>
            </div>

            {/* Scrutiny Checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Procedural Defect Scrutiny Checklist (Order 4 CPC)
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center justify-between">
                  <span className="text-stone-300">1. Court Fee Stamp Valuation & Computation</span>
                  <span className="text-[11px] font-medium text-stone-300 bg-[#221c18] border border-[#3e352f] px-2 py-0.5 rounded">Verified</span>
                </div>
                <div className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center justify-between">
                  <span className="text-stone-300">2. Vakalatnama Authorization & Bar Council Stamp</span>
                  <span className="text-[11px] font-medium text-stone-300 bg-[#221c18] border border-[#3e352f] px-2 py-0.5 rounded">Compliant</span>
                </div>
                <div className="p-3 border border-[#2d2621] rounded-lg bg-[#14110f] flex items-center justify-between">
                  <span className="text-stone-300">3. Legibility of Revenue Annexures & Boundary Survey Maps</span>
                  <span className="text-[11px] font-medium text-stone-300 bg-[#221c18] border border-[#3e352f] px-2 py-0.5 rounded">Certified</span>
                </div>
              </div>
            </div>

            {/* CNR Number Form */}
            {!selectedCase.cnrNumber && (
              <div className="p-4 border border-[#2d2621] rounded-lg bg-[#14110f] space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
                    Official CNR Allocation
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Per court rules, CNR numbers must be reviewed and issued under registrar authority.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={officialCnr}
                    onChange={(e) => setOfficialCnr(e.target.value)}
                    placeholder="Enter 16-character CNR (e.g. MHPU01-004912-2026)"
                    className="bw-input font-mono uppercase flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFillCnr}
                    className="bw-btn-secondary shrink-0 text-xs"
                  >
                    Generate Next In-Sequence
                  </button>
                  <button
                    type="button"
                    onClick={handleIssueCNR}
                    disabled={actionLoading || !officialCnr.trim()}
                    className="bw-btn-primary shrink-0 text-xs"
                  >
                    {actionLoading ? "Registering..." : "Issue & Register CNR"}
                  </button>
                </div>
              </div>
            )}

            {/* Physical Record Archival Tracking */}
            <div className="space-y-3 pt-2 border-t border-[#2d2621]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Physical Docket Archival Tracking
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 border border-[#2d2621] rounded-lg bg-[#14110f]">
                  <span className="text-stone-500 text-[10px] block">Complex</span>
                  <span className="font-semibold text-stone-200">{archiveForm.building}</span>
                </div>
                <div className="p-2.5 border border-[#2d2621] rounded-lg bg-[#14110f]">
                  <span className="text-stone-500 text-[10px] block">Record Room</span>
                  <span className="font-semibold text-stone-200">{archiveForm.room}</span>
                </div>
                <div className="p-2.5 border border-[#2d2621] rounded-lg bg-[#14110f]">
                  <span className="text-stone-500 text-[10px] block">Storage Location</span>
                  <span className="font-semibold text-stone-200">{archiveForm.rack} • {archiveForm.shelf} • {archiveForm.box}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Court Summons Modal */}
      <CourtSummonsModal
        isOpen={isSummonsOpen}
        onClose={() => setIsSummonsOpen(false)}
        petition={{
          id: selectedCase.id,
          cnr_number: selectedCase.cnrNumber || "MHPU02-004912-2026",
          citizen_name: selectedCase.applicant,
          category: selectedCase.type,
          description: selectedCase.summary,
          suggested_court: selectedCase.suggestedCourt,
        }}
      />

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow Registry Workspace • High Court Protocol & CNR Rule Compliance
      </footer>
    </div>
  );
}
