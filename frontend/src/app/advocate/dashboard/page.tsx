"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Inbox, Loader2, AlertCircle } from "lucide-react";
import { apiListPetitions, apiUpdatePetition } from "@/utils/api";
import AppHeader from "@/components/ui/app-header";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { getStoredUser, type StoredUser } from "@/lib/session";

interface ClientRequest {
  id: string;
  litigant: string;
  category: string;
  date: string;
  summary: string;
  suggestedCourt: string;
  status: string;
  advocate?: string | null;
}

const CHECKLIST = [
  "Client identity verified (Aadhaar / Voter ID)",
  "Title or property documents reviewed",
  "Cause of action and limitation checked",
  "Vakalatnama signed by the client",
];

export default function AdvocateDashboard() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentUser(getStoredUser());

    const load = async () => {
      try {
        const raw = await apiListPetitions();
        const mapped: ClientRequest[] = (Array.isArray(raw) ? raw : []).map((p: any) => ({
          id: p.id || p.cnr_number,
          litigant: p.citizen_name || "Unnamed litigant",
          category: p.category || "General civil",
          date: p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "",
          summary: p.description,
          suggestedCourt: p.suggested_court || "To be confirmed",
          status: p.status || "Scrutiny Pending",
          advocate: p.advocate_name,
        }));
        setRequests(mapped);
        setSelectedId(mapped[0]?.id ?? null);
      } catch (err: any) {
        setLoadError(err?.message || "Could not load client requests.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayName = currentUser?.fullName
    ? currentUser.fullName.toLowerCase().startsWith("adv") ? currentUser.fullName : `Adv. ${currentUser.fullName}`
    : undefined;

  const selected = requests.find((r) => r.id === selectedId) || null;
  const isAccepted = selected ? acceptedIds.includes(selected.id) : false;

  const handleAccept = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiUpdatePetition(selected.id, {
        advocate_name: displayName || currentUser?.email || "Advocate",
      });
      setAcceptedIds((prev) => [...prev, selected.id]);
    } catch (err: any) {
      setActionError(err?.message || "Could not accept this brief.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader workspace="Advocate" userName={displayName} userDetail={currentUser?.email} />

      <main className="container-page py-6 sm:py-8 flex-1 w-full space-y-6">
        <PageHeader
          title="Client requests"
          description="Review petitions from litigants, check their documents and accept representation."
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
              <h2 className="card-title">Inbox</h2>
              <span className="text-sm text-muted">{requests.length}</span>
            </div>
            {loading ? (
              <div className="p-10 flex justify-center text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <EmptyState icon={Inbox} title="No requests" description="New client petitions will appear here." />
            ) : (
              <ul className="divide-y divide-line max-h-[640px] overflow-y-auto">
                {requests.map((req) => {
                  const active = req.id === selectedId;
                  return (
                    <li key={req.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(req.id)}
                        aria-current={active ? "true" : undefined}
                        className={`w-full text-left px-5 py-3 cursor-pointer border-l-2 ${
                          active ? "bg-brand-soft border-brand" : "border-transparent hover:bg-subtle"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink truncate">{req.litigant}</span>
                          <span className="text-xs text-muted shrink-0">{req.date}</span>
                        </div>
                        <p className="text-sm text-muted truncate mt-0.5">{req.category}</p>
                        {acceptedIds.includes(req.id) && <span className="badge badge-success mt-1.5">Accepted</span>}
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
                  <h2 className="text-lg font-semibold text-ink">{selected.litigant}</h2>
                  <p className="text-sm text-muted mt-0.5">
                    {selected.category} · {selected.suggestedCourt}
                  </p>
                </div>
                {isAccepted ? (
                  <span className="badge badge-success text-sm py-1 px-3">
                    <CheckCircle2 className="w-4 h-4" />
                    You represent this client
                  </span>
                ) : (
                  <button type="button" onClick={handleAccept} disabled={actionLoading} className="btn btn-primary shrink-0">
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {actionLoading ? "Accepting…" : "Accept brief"}
                  </button>
                )}
              </div>

              <div className="card-body space-y-6">
                {actionError && (
                  <div className="callout callout-error">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-ink mb-2">Client&apos;s account</h3>
                  <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{selected.summary}</p>
                </div>

                <dl className="grid gap-px sm:grid-cols-3 bg-line border border-line rounded-lg overflow-hidden text-sm">
                  <div className="bg-surface p-3">
                    <dt className="text-xs text-muted">Status</dt>
                    <dd className="mt-0.5 text-ink">{selected.status}</dd>
                  </div>
                  <div className="bg-surface p-3">
                    <dt className="text-xs text-muted">Filed</dt>
                    <dd className="mt-0.5 text-ink">{selected.date || "—"}</dd>
                  </div>
                  <div className="bg-surface p-3">
                    <dt className="text-xs text-muted">Current counsel</dt>
                    <dd className="mt-0.5 text-ink">{selected.advocate || "None"}</dd>
                  </div>
                </dl>

                <div>
                  <h3 className="text-sm font-semibold text-ink mb-2">Before you accept</h3>
                  <ul className="space-y-2">
                    {CHECKLIST.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-ink-2">
                        <input type="checkbox" className="mt-1 accent-[var(--color-brand)]" aria-label={item} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ) : (
            !loading && (
              <section className="card">
                <EmptyState icon={Inbox} title="Select a request" description="Choose a client request to see the details." />
              </section>
            )
          )}
        </div>
      </main>
    </div>
  );
}
