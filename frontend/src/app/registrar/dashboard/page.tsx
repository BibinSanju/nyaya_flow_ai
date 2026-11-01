"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, FileText, Inbox, Loader2 } from "lucide-react";
import { apiListPetitions, apiUpdatePetition, apiArchivePetition } from "@/utils/api";
import CourtSummonsModal from "@/components/court-summons-modal";
import AppHeader from "@/components/ui/app-header";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { getStoredUser, type StoredUser } from "@/lib/session";

interface PetitionCase {
  id: string;
  applicant: string;
  advocate: string | null;
  type: string;
  date: string;
  summary: string;
  suggestedCourt: string;
  status: string;
  cnrNumber: string | null;
}

const SCRUTINY_CHECKS = [
  { id: "fee", label: "Court fee correctly computed and paid" },
  { id: "jurisdiction", label: "Court has territorial and pecuniary jurisdiction" },
  { id: "vakalat", label: "Vakalatnama or in-person appearance recorded" },
  { id: "annexures", label: "Annexures are legible and complete" },
];

const EMPTY_ARCHIVE = { building: "", room: "", rack: "", shelf: "", box: "" };

// 16 alphanumeric characters once separators are removed (e.g. MHPU01-004912-2026)
const isValidCnr = (v: string) => /^[A-Z0-9]{16}$/.test(v.replace(/[-\s]/g, "").toUpperCase());

export default function RegistrarDashboard() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [cases, setCases] = useState<PetitionCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [cnrInput, setCnrInput] = useState("");
  const [actionLoading, setActionLoading] = useState<null | "cnr" | "defect" | "archive">(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [archiveForm, setArchiveForm] = useState(EMPTY_ARCHIVE);
  const [isSummonsOpen, setIsSummonsOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    const load = async () => {
      try {
        const raw = await apiListPetitions();
        const mapped: PetitionCase[] = (Array.isArray(raw) ? raw : []).map((p: any) => ({
          id: p.id || p.cnr_number,
          applicant: p.citizen_name || "Unnamed applicant",
          advocate: p.advocate_name || null,
          type: p.category || "General civil",
          date: p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "",
          summary: p.description,
          suggestedCourt: p.suggested_court || "To be confirmed",
          status: p.status || "Scrutiny Pending",
          cnrNumber: p.cnr_number || null,
        }));
        setCases(mapped);
        setSelectedId(mapped.find((c) => !c.cnrNumber)?.id ?? mapped[0]?.id ?? null);
      } catch (err: any) {
        setLoadError(err?.message || "Could not load the filing queue.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selected = cases.find((c) => c.id === selectedId) || null;
  const allChecked = SCRUTINY_CHECKS.every((c) => checks[c.id]);
  const pending = cases.filter((c) => !c.cnrNumber).length;

  const selectCase = (id: string) => {
    setSelectedId(id);
    setChecks({});
    setCnrInput("");
    setArchiveForm(EMPTY_ARCHIVE);
    setMessage(null);
  };

  const updateCase = (id: string, patch: Partial<PetitionCase>) =>
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const handleIssueCnr = async () => {
    if (!selected) return;
    const cnr = cnrInput.trim().toUpperCase();
    if (!isValidCnr(cnr)) {
      setMessage({ tone: "error", text: "A CNR has 16 letters and digits, e.g. MHPU01-004912-2026." });
      return;
    }
    setActionLoading("cnr");
    setMessage(null);
    try {
      await apiUpdatePetition(selected.id, { cnr_number: cnr, status: "CNR Issued" });
      updateCase(selected.id, { cnrNumber: cnr, status: "CNR Issued" });
      setCnrInput("");
      setMessage({ tone: "success", text: `CNR ${cnr} issued. The case can now be listed.` });
    } catch (err: any) {
      setMessage({ tone: "error", text: err?.message || "Could not issue the CNR." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRaiseDefect = async () => {
    if (!selected) return;
    setActionLoading("defect");
    setMessage(null);
    try {
      await apiUpdatePetition(selected.id, { status: "Returned" });
      updateCase(selected.id, { status: "Returned" });
      setMessage({ tone: "success", text: "Marked as defective. The filer will be asked to correct it." });
    } catch (err: any) {
      setMessage({ tone: "error", text: err?.message || "Could not update the status." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async () => {
    if (!selected) return;
    setActionLoading("archive");
    setMessage(null);
    try {
      await apiArchivePetition(selected.id, {
        building: archiveForm.building,
        room_number: archiveForm.room,
        rack_number: archiveForm.rack,
        shelf_number: archiveForm.shelf,
        box_number: archiveForm.box,
      });
      setMessage({ tone: "success", text: "Record location saved." });
    } catch (err: any) {
      setMessage({ tone: "error", text: err?.message || "Could not save the record location." });
    } finally {
      setActionLoading(null);
    }
  };

  const suggestCnr = () => {
    const year = new Date().getFullYear();
    setCnrInput(`MHPU01-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}-${year}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader workspace="Court registry" userName={currentUser?.fullName} userDetail={currentUser?.email} />

      <main className="container-page py-6 sm:py-8 flex-1 w-full space-y-6">
        <PageHeader
          title="Scrutiny queue"
          description="Check new filings for defects, issue CNR numbers and record where the physical file is kept."
          actions={<span className="badge badge-warning text-sm py-1 px-3">{pending} awaiting scrutiny</span>}
        />

        {loadError && (
          <div className="callout callout-error">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="card overflow-hidden self-start">
            <div className="card-header">
              <h2 className="card-title">Filings</h2>
              <span className="text-sm text-muted">{cases.length}</span>
            </div>
            {loading ? (
              <div className="p-10 flex justify-center text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : cases.length === 0 ? (
              <EmptyState icon={Inbox} title="Queue is empty" description="New filings will appear here." />
            ) : (
              <ul className="divide-y divide-line max-h-[680px] overflow-y-auto">
                {cases.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectCase(c.id)}
                        aria-current={active ? "true" : undefined}
                        className={`w-full text-left px-5 py-3 cursor-pointer border-l-2 ${
                          active ? "bg-brand-soft border-brand" : "border-transparent hover:bg-subtle"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink truncate">{c.applicant}</span>
                          <span className="text-xs text-muted shrink-0">{c.date}</span>
                        </div>
                        <p className="text-sm text-muted truncate mt-0.5">{c.type}</p>
                        <div className="mt-1.5">
                          <StatusBadge status={c.status} cnr={c.cnrNumber} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selected ? (
            <section className="card">
              <div className="card-body border-b border-line flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-ink">{selected.applicant}</h2>
                  <p className="text-sm text-muted mt-0.5">
                    {selected.type} · {selected.suggestedCourt}
                    {selected.advocate && ` · Counsel: ${selected.advocate}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selected.cnrNumber && <span className="kbd-code">{selected.cnrNumber}</span>}
                  <button type="button" onClick={() => setIsSummonsOpen(true)} className="btn btn-secondary btn-sm">
                    <FileText className="w-4 h-4" />
                    Summons
                  </button>
                </div>
              </div>

              <div className="card-body space-y-6">
                {message && (
                  <div className={`callout ${message.tone === "success" ? "callout-success" : "callout-error"}`} role="status">
                    {message.tone === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{message.text}</span>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-ink mb-2">Petition</h3>
                  <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{selected.summary}</p>
                </div>

                {!selected.cnrNumber && (
                  <>
                    <fieldset>
                      <legend className="text-sm font-semibold text-ink mb-2">Scrutiny checklist</legend>
                      <div className="border border-line rounded-lg divide-y divide-line">
                        {SCRUTINY_CHECKS.map((item) => (
                          <label key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-2 cursor-pointer hover:bg-subtle">
                            <input
                              type="checkbox"
                              checked={!!checks[item.id]}
                              onChange={(e) => setChecks({ ...checks, [item.id]: e.target.checked })}
                              className="accent-[var(--color-brand)]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="cnr" className="label">CNR number</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id="cnr"
                          value={cnrInput}
                          onChange={(e) => setCnrInput(e.target.value.toUpperCase())}
                          placeholder="MHPU01-004912-2026"
                          className="input font-mono flex-1"
                        />
                        <button type="button" onClick={suggestCnr} className="btn btn-ghost">
                          Suggest
                        </button>
                      </div>
                      {!allChecked && <p className="hint">Complete the checklist before issuing a CNR.</p>}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleRaiseDefect}
                        disabled={actionLoading !== null}
                        className="btn btn-secondary"
                      >
                        {actionLoading === "defect" && <Loader2 className="w-4 h-4 animate-spin" />}
                        Return with defects
                      </button>
                      <button
                        type="button"
                        onClick={handleIssueCnr}
                        disabled={actionLoading !== null || !allChecked || !cnrInput.trim()}
                        className="btn btn-primary"
                      >
                        {actionLoading === "cnr" && <Loader2 className="w-4 h-4 animate-spin" />}
                        Issue CNR
                      </button>
                    </div>
                  </>
                )}

                <div className="divider" />

                <fieldset>
                  <legend className="text-sm font-semibold text-ink mb-1">Physical file location</legend>
                  <p className="text-sm text-muted mb-3">Where the paper file is stored in the record room.</p>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                    {(
                      [
                        ["building", "Building"],
                        ["room", "Room"],
                        ["rack", "Rack"],
                        ["shelf", "Shelf"],
                        ["box", "Box"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label htmlFor={`ar-${key}`} className="label">{label}</label>
                        <input
                          id={`ar-${key}`}
                          value={archiveForm[key]}
                          onChange={(e) => setArchiveForm({ ...archiveForm, [key]: e.target.value })}
                          className="input"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={actionLoading !== null || !archiveForm.building || !archiveForm.room}
                      className="btn btn-secondary btn-sm"
                    >
                      {actionLoading === "archive" && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save location
                    </button>
                  </div>
                </fieldset>
              </div>
            </section>
          ) : (
            !loading && (
              <section className="card">
                <EmptyState icon={Inbox} title="Select a filing" description="Choose a filing from the queue to review it." />
              </section>
            )
          )}
        </div>
      </main>

      {selected && (
        <CourtSummonsModal
          isOpen={isSummonsOpen}
          onClose={() => setIsSummonsOpen(false)}
          petition={{
            id: selected.id,
            cnr_number: selected.cnrNumber || "",
            citizen_name: selected.applicant,
            category: selected.type,
            description: selected.summary,
            suggested_court: selected.suggestedCourt,
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status, cnr }: { status: string; cnr: string | null }) {
  if (cnr) return <span className="badge badge-success">CNR issued</span>;
  if (status === "Returned") return <span className="badge badge-danger">Returned with defects</span>;
  return <span className="badge badge-warning">{status}</span>;
}
