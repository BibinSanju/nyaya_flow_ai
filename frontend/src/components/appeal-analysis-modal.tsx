"use client";

import { useState } from "react";
import { AlertTriangle, Clock, BookOpen, FileText, CheckCircle, Copy, ArrowRight, Loader2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { apiAnalyzeAppeal } from "@/utils/api";

interface AppealAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData?: {
    id?: string;
    cnr?: string;
    petitioner?: string;
    court?: string;
    category?: string;
    description?: string;
  };
  onPrepareAppeal?: (appealPackage: any) => void;
}

export default function AppealAnalysisModal({
  isOpen,
  onClose,
  caseData,
  onPrepareAppeal,
}: AppealAnalysisModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [decreeType, setDecreeType] = useState("Injunction Refused / Adverse Order");
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await apiAnalyzeAppeal({
        court: caseData?.court || "Subordinate Civil Court, Pune",
        category: caseData?.category || "Property & Land Dispute (Civil)",
        decree_type: decreeType,
        summary: caseData?.description || "Grievance details pending.",
        petitioner_name: caseData?.petitioner || "Appellant",
      });

      if (!res.success) throw new Error(res.error || "Analysis failed.");
      setAnalysisResult(res);
    } catch (err: any) {
      setAnalysisError(err?.message || "Could not analyse this case. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (analysisResult?.appeal_draft) {
      navigator.clipboard.writeText(analysisResult.appeal_draft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Grounds for appeal"
      description="Check where an appeal lies, the time limit, and possible grounds. AI-generated — verify with an advocate."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          {analysisResult && onPrepareAppeal && (
            <button
              type="button"
              onClick={() => {
                onPrepareAppeal({
                  category: "Civil Appellate Petition",
                  description: `Regular Civil Appeal against Impugned Order of ${caseData?.court}. Grounds: ${analysisResult.analysis.suggestedGrounds[0]}`,
                  suggested_court: analysisResult.analysis.appellateForum,
                });
                onClose();
              }}
              className="btn btn-primary"
            >
              Start an appeal petition
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <dl className="grid gap-px sm:grid-cols-3 bg-line border border-line rounded-lg overflow-hidden text-sm">
          <div className="bg-surface p-3">
            <dt className="text-xs text-muted">CNR</dt>
            <dd className="mt-0.5 font-mono text-ink">{caseData?.cnr || "Not issued"}</dd>
          </div>
          <div className="bg-surface p-3">
            <dt className="text-xs text-muted">Court</dt>
            <dd className="mt-0.5 text-ink">{caseData?.court || "—"}</dd>
          </div>
          <div className="bg-surface p-3">
            <dt className="text-xs text-muted">Category</dt>
            <dd className="mt-0.5 text-ink">{caseData?.category || "—"}</dd>
          </div>
        </dl>

        {!analysisResult ? (
          <div className="max-w-md space-y-3">
            <div>
              <label htmlFor="decreeType" className="label">What kind of order are you appealing?</label>
              <select id="decreeType" value={decreeType} onChange={(e) => setDecreeType(e.target.value)} className="input">
                <option value="Injunction Refused / Adverse Order">Interim injunction refused (CPC Order 39)</option>
                <option value="Final Suit Dismissal (Civil Decree)">Suit dismissed (final decree)</option>
                <option value="Bail Application Rejected">Bail rejected (BNSS s. 480)</option>
                <option value="Adverse Revenue Mutation Order">Adverse revenue / 7/12 mutation order</option>
              </select>
            </div>
            {analysisError && (
              <div className="callout callout-error">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
            <button type="button" onClick={handleRunAnalysis} disabled={analyzing} className="btn btn-primary">
              {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
              {analyzing ? "Analysing…" : "Analyse"}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-line rounded-lg p-4">
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <BookOpen className="w-3.5 h-3.5" />
                  Appeal lies before
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{analysisResult.analysis.appellateForum}</p>
                <p className="mt-0.5 text-xs text-muted">{analysisResult.analysis.statutoryProvision}</p>
              </div>
              <div className="border border-warning/30 bg-warning-soft rounded-lg p-4">
                <p className="flex items-center gap-1.5 text-xs text-warning">
                  <Clock className="w-3.5 h-3.5" />
                  Time limit
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {analysisResult.analysis.limitationDays} days from the date of the order
                </p>
                <p className="mt-0.5 text-xs text-muted">{analysisResult.analysis.limitationActArticle}</p>
              </div>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-ink mb-2">Possible grounds</h3>
              <ol className="space-y-2 text-sm text-ink-2 list-[lower-alpha] pl-5">
                {analysisResult.analysis.suggestedGrounds.map((g: string, i: number) => (
                  <li key={i}>{g}</li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-ink mb-2">Documents to attach</h3>
              <ul className="grid gap-2 sm:grid-cols-2 text-sm text-ink-2">
                {analysisResult.analysis.requiredDocuments.map((doc: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-ink">Draft memorandum of appeal</h3>
                <button type="button" onClick={handleCopy} className="btn btn-ghost btn-sm">
                  {copiedDraft ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copiedDraft ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-4 rounded-lg border border-line bg-subtle font-mono text-xs text-ink-2 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {analysisResult.appeal_draft}
              </pre>
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}
