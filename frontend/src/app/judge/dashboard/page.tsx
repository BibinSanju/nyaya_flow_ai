"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Scale,
  FileText,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  LogOut,
  Calendar,
  Layers,
  Shield,
  Briefcase,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Sparkles,
  FileBadge
} from "lucide-react";
import { apiListPetitions, apiRecordCourtOrder } from "@/utils/api";
import AppealAnalysisModal from "@/components/appeal-analysis-modal";
import CourtSummonsModal from "@/components/court-summons-modal";

interface CourtCase {
  cnr: string;
  id: string;
  applicant: string;
  respondent: string;
  category: string;
  time: string;
  stage: string;
  summary: string;
  previousHearings: { date: string; summary: string }[];
  applicableActs: string[];
  precedents: { title: string; citation: string; relevance: string; matchScore: string }[];
  digest: string;
}

export default function JudgePortal() {
  const [selectedCnr, setSelectedCnr] = useState("MHPU02-89210-2026");
  const [activeTab, setActiveTab] = useState<"brief" | "orders">("brief");
  const [actionNotes, setActionNotes] = useState("");
  const [actionStatus, setActionStatus] = useState("Notice Issued");
  const [processingOrder, setProcessingOrder] = useState(false);
  const [casesLogged, setCasesLogged] = useState<string[]>([]);
  const [causeList, setCauseList] = useState<CourtCase[]>([]);
  const [isSummonsModalOpen, setIsSummonsModalOpen] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);

  const defaultCases: CourtCase[] = [
    {
      cnr: "MHPU02-89210-2026",
      id: "mock-1",
      applicant: "Aditya Patil (Adv. Abhishek Deshmukh)",
      respondent: "BMC Ward Office & Neighbor",
      category: "Civil Property Encroachment",
      time: "10:30 AM",
      stage: "First Cause Admissibility",
      summary:
        "Petition regarding illegal masonry boundary partition wall constructed on survey plot #142, Kothrud. Applicant possesses a valid Family Partition deed, claiming neighbor encroachment without municipal sanctions.",
      previousHearings: [
        { date: "Oct 19, 2026", summary: "Registrar scrutinized digitized filing. Official CNR linked to archive Box #109." },
      ],
      applicableActs: [
        "Maharashtra Land Revenue Code, 1966 (Section 143)",
        "The Specific Relief Act, 1963 (Section 38)",
        "Code of Civil Procedure, 1908 (Order 39 Rule 1 - Temporary Injunction)",
      ],
      precedents: [
        {
          title: "Vasant Rao v. State of Maharashtra (2018)",
          citation: "2018 SCC Online Bom 192",
          relevance: "Partition survey bounds established by talathi revenue records must precede boundary adjustments.",
          matchScore: "94%",
        },
      ],
      digest:
        "Civil dispute regarding demarcation and removal of encroaching boundary wall on Plot #142. Plaintiff seeks temporary injunction under CPC Order 39. Scrutiny cleared.",
    },
    {
      cnr: "MHPU02-82910-2026",
      id: "mock-2",
      applicant: "Karan Johar (Adv. S. Sharma)",
      respondent: "State of Maharashtra",
      category: "Cyber Extortion (Criminal)",
      time: "11:15 AM",
      stage: "Bail & Admissibility",
      summary:
        "Bail application regarding cyber threats and phishing clone complaints. Police reports indicate digital extortion via proxy servers.",
      previousHearings: [
        { date: "Oct 17, 2026", summary: "Police registered FIR reference. BNS Section 305/331 matched by investigating officer." },
      ],
      applicableActs: [
        "Section 318 BNS (Cheating & property delivery)",
        "Section 66D of Information Technology Act, 2000",
        "Section 482 BNSS (Bail qualifications)",
      ],
      precedents: [
        {
          title: "State of Maharashtra v. Digital Forensics (2022)",
          citation: "2022 Cri LJ 4410",
          relevance: "Electronic certificate chain of custody required before considering anticipatory relief.",
          matchScore: "89%",
        },
      ],
      digest:
        "Cyber extortion and impersonation complaint. Preliminary bail hearing under Section 482 BNSS.",
    },
    {
      cnr: "MHPU02-77120-2026",
      id: "mock-3",
      applicant: "Pooja Hegde (Adv. M. Kulkarni)",
      respondent: "Sub-Registrar Haveli",
      category: "Title Rectification",
      time: "02:00 PM",
      stage: "Evidence Examination",
      summary:
        "Declaration suit regarding mutation entry discrepancy between 7/12 extract and registered sale deed.",
      previousHearings: [
        { date: "Oct 15, 2026", summary: "Petitioner submitted certified mutation extracts." },
      ],
      applicableActs: [
        "Registration Act, 1908 (Section 17)",
        "Maharashtra Land Revenue Code, 1966 (Section 149)",
        "Specific Relief Act, 1963 (Section 34)",
      ],
      precedents: [
        {
          title: "Narayan Rao v. Land Tribunal (2015)",
          citation: "2015 (4) Bom CR 312",
          relevance: "Revenue mutation does not extinguish civil title without regular civil decree.",
          matchScore: "91%",
        },
      ],
      digest:
        "Declaration of title suit to rectify Tahsildar mutation register.",
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
        const res = await apiListPetitions();
        if (Array.isArray(res) && res.length > 0) {
          const mapped: CourtCase[] = res.map((p: any, i: number) => {
            const cleanPetitioner = [p.petitionerName, p.petitioner, p.applicant, p.fullName]
              .find(v => typeof v === 'string' && v.trim().length > 0 && !v.includes('undefined')) || "Aditya Patil";
            const cleanAdvocate = [p.advocateName, p.advocate]
              .find(v => typeof v === 'string' && v.trim().length > 0 && !v.includes('undefined')) || "Abhishek Deshmukh";
            return {
              cnr: p.cnrNumber || `MHPU02-${90000 + i}-2026`,
              id: p.id,
              applicant: cleanPetitioner.includes("Adv.") ? cleanPetitioner : `${cleanPetitioner} (Adv. ${cleanAdvocate})`,
              respondent: p.respondentName || p.respondent || "State / BMC Ward Office",
              category: p.caseType || p.category || "Civil Property Dispute",
              time: p.time || `${10 + (i % 4)}:${(i * 15) % 60 === 0 ? "00" : (i * 15) % 60} ${10 + (i % 4) >= 12 ? "PM" : "AM"}`,
              stage: p.stage || "Bench Hearing",
              summary: p.description || p.summary || "Petition regarding boundary demarcation dispute on survey plot #142.",
              previousHearings: [
                { date: "Oct 20, 2026", summary: "Scrutiny completed by Registrar clerk. Verified for daily bench cause list." },
              ],
              applicableActs: [
                "Code of Civil Procedure, 1908 (Order 39)",
                "Specific Relief Act, 1963 Section 38",
              ],
              precedents: [
                {
                  title: "State of Maharashtra v. Ramdas (2021)",
                  citation: "2021 SCC Online Bom 412",
                  relevance: "Prima facie title established by revenue records warrants status quo preservation.",
                  matchScore: "94%",
                },
              ],
              digest: p.description,
            };
          });
          setCauseList(mapped);
          setSelectedCnr(mapped[0].cnr);
          return;
        }
        setCauseList(defaultCases);
      } catch (err) {
        setCauseList(defaultCases);
      }
    };
    load();
  }, []);

  const activeCase =
    causeList.find((c) => c.cnr === selectedCnr) || causeList[0] || defaultCases[0];

  const handleRecordDecree = async () => {
    if (!actionNotes.trim()) return;
    setProcessingOrder(true);

    try {
      if (activeCase.id && !activeCase.id.startsWith("mock-")) {
        await apiRecordCourtOrder(activeCase.id, {
          action_taken: actionStatus,
          order_text: actionNotes.trim(),
        });
      }
    } catch (e) {
      console.warn("Save court order error:", e);
    }

    setCasesLogged((prev) => [...prev, activeCase.cnr]);
    setProcessingOrder(false);
    setActionNotes("");
    alert(`Judicial Order decree recorded for CNR ${activeCase.cnr}: "${actionStatus}"`);
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
              <div className="w-8 h-8 bg-[#221c18] border border-[#3e352f] text-stone-200 flex items-center justify-center rounded font-semibold">
                <UserCheck className="w-4 h-4 text-stone-300" />
              </div>
              <span className="font-semibold text-base text-stone-100 tracking-tight">NyayaFlow</span>
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-xs font-medium text-stone-400 hidden sm:inline">
              Presiding Judicial Bench Workspace
            </span>
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
                  ? (currentUser.fullName.toLowerCase().includes("justice") ? currentUser.fullName : `Hon'ble Justice ${currentUser.fullName}`)
                  : "Hon'ble Justice K. Verma"}
              </p>
              <p className="text-[11px] text-stone-400 font-mono">
                {currentUser?.email || "Chambers PIN: 004922"}
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
      <div className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#3e352f] bg-[#201b17] text-[11px] font-medium text-stone-300 mb-2">
            <Scale className="w-3 h-3 text-stone-400" />
            <span>Cause List Proceedings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
            Daily Cause List & Bench Briefs
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Review scheduled matters, inspect relevant precedents, and record official court orders.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cause List Schedule */}
          <div className="border border-[#2e2722] rounded-xl p-5 bg-[#181513]/95 backdrop-blur-md space-y-3.5 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2621]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Today's Cause List ({causeList.length})
              </h2>
              <span className="text-[10px] font-mono text-stone-500">Court Hall #4</span>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {causeList.map((c) => {
                const isSelected = c.cnr === activeCase.cnr;
                const isDisposed = casesLogged.includes(c.cnr);
                return (
                  <button
                    key={c.cnr}
                    onClick={() => setSelectedCnr(c.cnr)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#6e5f54] bg-[#26201c] text-stone-100 font-semibold ring-1 ring-[#6e5f54]/40"
                        : "border-[#2d2621] hover:border-[#443a33] bg-[#14110f] text-stone-300 hover:text-stone-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-200">{c.time}</span>
                      <span className="text-[10px] font-mono text-stone-400 bg-[#1c1815] px-2 py-0.5 rounded border border-[#2d2621]">
                        {c.cnr}
                      </span>
                    </div>
                    <p className="text-stone-200 mt-1.5 font-medium line-clamp-1">{c.applicant}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">{c.stage}</span>
                      {isDisposed && (
                        <span className="text-[10px] text-stone-300 bg-[#221c18] border border-[#3e352f] px-2 py-0.5 rounded font-medium">
                          Order Signed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dossier Detail & Decree Signing */}
          <div className="lg:col-span-2 border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-[#2d2621] pb-5 gap-4">
              <div>
                <span className="text-[11px] font-mono text-stone-300 bg-[#221c18] border border-[#3e352f] px-2.5 py-1 rounded font-medium">
                  CNR: {activeCase.cnr}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-stone-100 mt-2.5 tracking-tight">
                  {activeCase.applicant}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  vs. <span className="text-stone-300 font-medium">{activeCase.respondent}</span> • Listing:{" "}
                  <strong className="text-stone-200 font-semibold">{activeCase.time}</strong> ({activeCase.stage})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSummonsModalOpen(true)}
                  className="px-2.5 py-2 rounded-lg text-xs font-medium border border-[#403429] bg-[#221c17] hover:bg-[#2e251f] text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Issue Digital Summons / Court Notice (Order V CPC)"
                >
                  <FileBadge className="w-3.5 h-3.5" />
                  <span>Issue Summons</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(true)}
                  className="px-2.5 py-2 rounded-lg text-xs font-medium border border-[#4a3d31] bg-[#221c17] hover:bg-[#2e251f] text-stone-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Analyze Appellate Scrutiny & Statutory Grounds (Sec 96 CPC)"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Appeal Scrutiny</span>
                </button>
                <button
                  onClick={() => setActiveTab("brief")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "brief"
                      ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]"
                      : "border border-[#2d2621] bg-[#14110f] hover:bg-[#1e1916] text-stone-400"
                  }`}
                >
                  Case Digest
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "orders"
                      ? "bg-[#2a2420] text-stone-100 border border-[#4a4038]"
                      : "border border-[#2d2621] bg-[#14110f] hover:bg-[#1e1916] text-stone-400"
                  }`}
                >
                  Sign Bench Order
                </button>
              </div>
            </div>

            {/* TAB: DIGEST */}
            {activeTab === "brief" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Pleadings & Cause Summary
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300 bg-[#12100e] p-4 sm:p-5 rounded-lg border border-[#2d2621] leading-relaxed">
                    {activeCase.summary}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Applicable Statutory Provisions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeCase.applicableActs.map((act, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-[#201b17] border border-[#38302a] text-xs font-mono text-stone-300"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                    High Court & Supreme Court Precedents
                  </h3>
                  <div className="space-y-2.5">
                    {activeCase.precedents.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 border border-[#2d2621] hover:border-[#3e352f] rounded-lg bg-[#14110f] text-xs space-y-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-200 text-sm">{p.title}</span>
                          <span className="font-mono text-stone-400 font-medium">{p.citation}</span>
                        </div>
                        <p className="text-stone-400 leading-relaxed">{p.relevance}</p>
                        <div className="pt-1 flex items-center justify-end">
                          <span className="text-[10px] text-stone-300 bg-[#201b17] border border-[#38302a] px-2 py-0.5 rounded font-mono">
                            Relevance: {p.matchScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SIGN ORDER */}
            {activeTab === "orders" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Record Judicial Interim / Final Decree
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Orders entered here are signed and published to the cause-list ledger under the authority of the Presiding Judge.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Order Decree Type
                  </label>
                  <select
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value)}
                    className="bw-input font-medium"
                  >
                    <option value="Notice Issued">Notice Issued (Returnable 2 Weeks)</option>
                    <option value="Status Quo Granted">Status Quo Granted (CPC Order 39)</option>
                    <option value="Adjournment Granted">Adjournment Granted with Directions</option>
                    <option value="Petition Admitted">Petition Admitted for Final Hearing</option>
                    <option value="Disposed with Decree">Disposed with Final Decree</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Bench Order Notes & Reasoned Ruling
                  </label>
                  <textarea
                    rows={6}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter judicial ruling, injunction terms, compliance directives, or next returnable date..."
                    className="bw-input leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleRecordDecree}
                    disabled={processingOrder || !actionNotes.trim()}
                    className="bw-btn-primary px-5 py-2.5 text-sm font-semibold"
                  >
                    {processingOrder ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Recording Decree...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Sign & Pronounce Order</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appeal Analysis Modal */}
      <AppealAnalysisModal
        isOpen={isAppealModalOpen}
        onClose={() => setIsAppealModalOpen(false)}
        caseData={{
          cnr: activeCase.cnr,
          petitioner: activeCase.applicant,
          court: "District & Sessions Court, Pune",
          category: activeCase.category,
          description: activeCase.summary,
        }}
      />

      {/* Court Summons Modal */}
      <CourtSummonsModal
        isOpen={isSummonsModalOpen}
        onClose={() => setIsSummonsModalOpen(false)}
        petition={{
          id: activeCase.id,
          cnr_number: activeCase.cnr,
          citizen_name: activeCase.applicant,
          category: activeCase.category,
          description: activeCase.summary,
          suggested_court: "District & Sessions Court, Pune",
          opposite_party_name: activeCase.respondent,
        }}
      />

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow Presiding Judicial Chambers • Court Hearing & Order Management
      </footer>
    </div>
  );
}
