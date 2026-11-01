"use client";

import { useState } from "react";
import { Search, Calendar, Building, User, FileText, Archive, AlertCircle, Gavel, Loader2 } from "lucide-react";
import { apiLookupCnr } from "@/utils/api";
import AppealAnalysisModal from "@/components/appeal-analysis-modal";
import CourtSummonsModal from "@/components/court-summons-modal";

interface CnrTrackerProps {
  onCaseSelect?: (dossier: any) => void;
  className?: string;
  defaultCnr?: string;
}

const SAMPLE_CNRS = ["MHPU02-004912-2026", "DLSW01-002134-2026", "KABG03-008129-2026"];

export default function CnrTracker({ onCaseSelect, className = "", defaultCnr = "" }: CnrTrackerProps) {
  const [cnrInput, setCnrInput] = useState(defaultCnr);
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [isSummonsModalOpen, setIsSummonsModalOpen] = useState(false);

  const handleSearch = async (overrideCnr?: string) => {
    const target = (overrideCnr || cnrInput).trim();
    if (!target) {
      setError("Enter a CNR number to search.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiLookupCnr(target);
      if (res.success && res.dossier) {
        setDossier(res.dossier);
        onCaseSelect?.(res.dossier);
      } else {
        setDossier(null);
        setError(res.error || "No case found for this CNR number.");
      }
    } catch (err: any) {
      setDossier(null);
      setError(err?.message || "Could not reach the case records service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`card ${className}`}>
      <div className="card-body space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Track a case</h2>
          <p className="text-sm text-muted mt-0.5">
            Enter the 16-character CNR number printed on your filing receipt.
          </p>
        </div>

        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="text"
              value={cnrInput}
              onChange={(e) => setCnrInput(e.target.value.toUpperCase())}
              placeholder="e.g. MHPU02-004912-2026"
              aria-label="CNR number"
              className="input pl-9 font-mono uppercase placeholder:normal-case placeholder:font-sans"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Try an example:</span>
          {SAMPLE_CNRS.map((cnr) => (
            <button
              key={cnr}
              type="button"
              onClick={() => {
                setCnrInput(cnr);
                handleSearch(cnr);
              }}
              className="kbd-code hover:border-line-strong cursor-pointer"
            >
              {cnr}
            </button>
          ))}
        </div>

        {error && (
          <div className="callout callout-error">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {dossier && (
        <div className="border-t border-line">
          <div className="card-body space-y-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="kbd-code font-semibold">{dossier.cnr}</span>
                  <span className="badge badge-success">{dossier.status || "Registered"}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-ink">{dossier.category}</h3>
                {dossier.description && (
                  <p className="mt-1 text-sm text-ink-2 max-w-3xl">{dossier.description}</p>
                )}
              </div>
              {dossier.health_score != null && (
                <div className="shrink-0 text-sm md:text-right">
                  <p className="text-xs text-muted">Filing completeness</p>
                  <p className="font-semibold text-ink">{dossier.health_score}%</p>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden">
              <Detail icon={User} label="Petitioner" value={dossier.petitioner} sub={dossier.advocate ? `Counsel: ${dossier.advocate}` : "Self-represented"} />
              <Detail icon={Building} label="Court" value={dossier.suggested_court} sub={dossier.bench} />
              <Detail icon={Calendar} label="Next hearing" value={dossier.next_hearing_date || "Not yet listed"} sub={dossier.filing_date ? `Filed ${dossier.filing_date}` : undefined} />
              <Detail icon={Archive} label="Record location" value={dossier.archival_location || "Not yet archived"} />
            </dl>

            {dossier.orders && dossier.orders.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
                  <Gavel className="w-4 h-4 text-muted" />
                  Orders and proceedings
                </h4>
                <ol className="border border-line rounded-lg divide-y divide-line">
                  {dossier.orders.map((ord: any, idx: number) => (
                    <li key={idx} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-ink">{ord.stage || "Court order"}</span>
                        <span className="text-xs text-muted shrink-0">{ord.hearing_date}</span>
                      </div>
                      <p className="mt-1 text-ink-2">{ord.order_text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setIsSummonsModalOpen(true)} className="btn btn-secondary btn-sm">
                <FileText className="w-4 h-4" />
                View summons
              </button>
              <button type="button" onClick={() => setIsAppealModalOpen(true)} className="btn btn-secondary btn-sm">
                <Gavel className="w-4 h-4" />
                Check grounds for appeal
              </button>
            </div>
          </div>
        </div>
      )}

      <AppealAnalysisModal
        isOpen={isAppealModalOpen}
        onClose={() => setIsAppealModalOpen(false)}
        caseData={{
          cnr: dossier?.cnr,
          petitioner: dossier?.petitioner,
          court: dossier?.suggested_court,
          category: dossier?.category,
          description: dossier?.description,
        }}
      />

      <CourtSummonsModal
        isOpen={isSummonsModalOpen}
        onClose={() => setIsSummonsModalOpen(false)}
        petition={{
          id: dossier?.id,
          cnr_number: dossier?.cnr,
          citizen_name: dossier?.petitioner,
          category: dossier?.category,
          description: dossier?.description,
          suggested_court: dossier?.suggested_court,
        }}
      />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof User;
  label: string;
  value?: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface p-3 min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink break-words">{value || "—"}</dd>
      {sub && <dd className="text-xs text-muted break-words">{sub}</dd>}
    </div>
  );
}
