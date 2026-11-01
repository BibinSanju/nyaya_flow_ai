"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ExternalLink, FileText, Gavel, Loader2 } from "lucide-react";
import { apiListPetitions, apiRecordCourtOrder } from "@/utils/api";
import AppealAnalysisModal from "@/components/appeal-analysis-modal";
import CourtSummonsModal from "@/components/court-summons-modal";
import AppHeader from "@/components/ui/app-header";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { getStoredUser, type StoredUser } from "@/lib/session";
import { getStructuredStatutoryProvisions } from "@/data/jurisdictionData";

interface CourtOrder {
  id?: string;
  action_taken?: string;
  order_text?: string;
  hearing_date?: string;
  stage?: string;
  created_at?: string;
}

interface CourtCase {
  id: string;
  cnr: string;
  applicant: string;
  advocate: string | null;
  category: string;
  court: string;
  status: string;
  summary: string;
  orders: CourtOrder[];
}

const ORDER_TYPES = [
  "Notice Issued",
  "Status Quo Granted",
  "Adjournment Granted",
  "Petition Admitted",
  "Disposed with Decree",
];

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function JudgePortal() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"brief" | "order">("brief");

  const [orderType, setOrderType] = useState(ORDER_TYPES[0]);
  const [orderText, setOrderText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [isSummonsOpen, setIsSummonsOpen] = useState(false);
  const [isAppealOpen, setIsAppealOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    const load = async () => {
      try {
        const raw = await apiListPetitions();
        const mapped: CourtCase[] = (Array.isArray(raw) ? raw : [])
          .filter((p: any) => p.cnr_number)
          .map((p: any) => ({
            id: p.id,
            cnr: p.cnr_number,
            applicant: p.citizen_name || "Unnamed petitioner",
            advocate: p.advocate_name || null,
            category: p.category || "General civil",
            court: p.suggested_court || "",
            status: p.status || "Listed",
            summary: p.description || "",
            orders: Array.isArray(p.court_orders) ? p.court_orders : [],
          }));
        setCases(mapped);
        setSelectedId(mapped[0]?.id ?? null);
      } catch (err: any) {
        setLoadError(err?.message || "Could not load the cause list.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selected = cases.find((c) => c.id === selectedId) || null;

  const selectCase = (id: string) => {
    setSelectedId(id);
    setTab("brief");
    setOrderText("");
    setMessage(null);
  };

  const handleRecordOrder = async () => {
    if (!selected || !orderText.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiRecordCourtOrder(selected.id, { action_taken: orderType, order_text: orderText.trim() });
      const newOrder: CourtOrder = res?.order || {
        action_taken: orderType,
        order_text: orderText.trim(),
        created_at: new Date().toISOString(),
      };
      setCases((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, orders: [...c.orders, newOrder], status: orderType.startsWith("Disposed") ? "Disposed" : "Hearings Active" }
            : c
        )
      );
      setOrderText("");
      setMessage({ tone: "success", text: "Order recorded and added to the case history." });
      setTab("brief");
    } catch (err: any) {
      setMessage({ tone: "error", text: err?.message || "Could not record the order." });
    } finally {
      setSaving(false);
    }
  };

  const judgeName = currentUser?.fullName
    ? /justice|judge/i.test(currentUser.fullName) ? currentUser.fullName : `Hon'ble ${currentUser.fullName}`
    : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader workspace="Judge" userName={judgeName} userDetail={currentUser?.email} />

      <main className="container-page py-6 sm:py-8 flex-1 w-full space-y-6">
        <PageHeader
          title="Cause list"
          description="Cases with a CNR number, ready for hearing. Review the brief and record orders."
          actions={
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays className="w-4 h-4" />
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          }
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
              <h2 className="card-title">Listed cases</h2>
              <span className="text-sm text-muted">{cases.length}</span>
            </div>
            {loading ? (
              <div className="p-10 flex justify-center text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : cases.length === 0 ? (
              <EmptyState icon={Gavel} title="No listed cases" description="Cases appear here once the registry issues a CNR." />
            ) : (
              <ol className="divide-y divide-line max-h-[680px] overflow-y-auto">
                {cases.map((c, idx) => {
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
                          <span className="text-xs font-medium text-muted">Item {idx + 1}</span>
                          <span className="font-mono text-xs text-muted">{c.cnr}</span>
                        </div>
                        <p className="text-sm font-medium text-ink truncate mt-0.5">{c.applicant}</p>
                        <p className="text-sm text-muted truncate">{c.category}</p>
                        {c.status === "Disposed" && <span className="badge mt-1.5">Disposed</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {selected ? (
            <section className="card">
              <div className="card-body pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="kbd-code">{selected.cnr}</span>
                  <h2 className="mt-2 text-lg font-semibold text-ink">{selected.applicant}</h2>
                  <p className="text-sm text-muted mt-0.5">
                    {selected.category}
                    {selected.advocate && ` · Counsel: ${selected.advocate}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => setIsSummonsOpen(true)} className="btn btn-secondary btn-sm">
                    <FileText className="w-4 h-4" />
                    Summons
                  </button>
                  <button type="button" onClick={() => setIsAppealOpen(true)} className="btn btn-secondary btn-sm">
                    <Gavel className="w-4 h-4" />
                    Appeal check
                  </button>
                </div>
              </div>

              <div className="tabs px-5 mt-4" role="tablist">
                <button type="button" role="tab" aria-selected={tab === "brief"} onClick={() => setTab("brief")} className="tab">
                  Case brief
                </button>
                <button type="button" role="tab" aria-selected={tab === "order"} onClick={() => setTab("order")} className="tab">
                  Record order
                </button>
              </div>

              <div className="card-body space-y-6">
                {message && (
                  <div className={`callout ${message.tone === "success" ? "callout-success" : "callout-error"}`} role="status">
                    {message.tone === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{message.text}</span>
                  </div>
                )}

                {tab === "brief" ? (
                  <>
                    <section>
                      <h3 className="text-sm font-semibold text-ink mb-2">Petition</h3>
                      <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{selected.summary}</p>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-ink mb-2">Orders so far</h3>
                      {selected.orders.length === 0 ? (
                        <p className="text-sm text-muted">No orders recorded yet.</p>
                      ) : (
                        <ol className="border border-line rounded-lg divide-y divide-line">
                          {selected.orders.map((o, i) => (
                            <li key={o.id || i} className="p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-ink">{o.action_taken || o.stage || "Order"}</span>
                                <span className="text-xs text-muted shrink-0">{formatDate(o.hearing_date || o.created_at)}</span>
                              </div>
                              <p className="mt-1 text-ink-2 whitespace-pre-line">{o.order_text}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-ink mb-1">Provisions that may apply</h3>
                      <p className="text-xs text-muted mb-2">Suggested from the case category. Verify before relying on them.</p>
                      <ul className="border border-line rounded-lg divide-y divide-line">
                        {getStructuredStatutoryProvisions(selected.category, selected.summary).map((p, i) => (
                          <li key={i} className="p-3 text-sm flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-ink">
                                {p.law_name} — <span className="font-mono text-xs">{p.section_rule}</span>
                              </p>
                              <p className="text-ink-2 mt-0.5">{p.relevance}</p>
                            </div>
                            {p.official_source_url && (
                              <a href={p.official_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand hover:underline shrink-0">
                                India Code
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRecordOrder();
                    }}
                  >
                    <div>
                      <label htmlFor="orderType" className="label">Order</label>
                      <select id="orderType" value={orderType} onChange={(e) => setOrderType(e.target.value)} className="input max-w-sm">
                        {ORDER_TYPES.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="orderText" className="label">Order text</label>
                      <textarea
                        id="orderText"
                        rows={8}
                        value={orderText}
                        onChange={(e) => setOrderText(e.target.value)}
                        placeholder="Reasons, directions to the parties, and the next date of hearing."
                        className="input"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={saving || !orderText.trim()} className="btn btn-primary">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Recording…" : "Record order"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          ) : (
            !loading && (
              <section className="card">
                <EmptyState icon={Gavel} title="Select a case" description="Choose a case from the list to see its brief." />
              </section>
            )
          )}
        </div>
      </main>

      {selected && (
        <>
          <AppealAnalysisModal
            isOpen={isAppealOpen}
            onClose={() => setIsAppealOpen(false)}
            caseData={{
              cnr: selected.cnr,
              petitioner: selected.applicant,
              court: selected.court,
              category: selected.category,
              description: selected.summary,
            }}
          />
          <CourtSummonsModal
            isOpen={isSummonsOpen}
            onClose={() => setIsSummonsOpen(false)}
            petition={{
              id: selected.id,
              cnr_number: selected.cnr,
              citizen_name: selected.applicant,
              category: selected.category,
              description: selected.summary,
              suggested_court: selected.court,
            }}
          />
        </>
      )}
    </div>
  );
}
