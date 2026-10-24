"use client";

import { useState } from "react";
import {
  Scale,
  AlertTriangle,
  Clock,
  BookOpen,
  FileText,
  CheckCircle,
  Copy,
  ArrowRight,
  X,
  Sparkles,
  ExternalLink
} from "lucide-react";
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

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await apiAnalyzeAppeal({
        court: caseData?.court || "Subordinate Civil Court, Pune",
        category: caseData?.category || "Property & Land Dispute (Civil)",
        decree_type: decreeType,
        summary: caseData?.description || "Grievance details pending.",
        petitioner_name: caseData?.petitioner || "Appellant",
      });

      if (res.success) {
        setAnalysisResult(res);
      }
    } catch (err) {
      console.error("Appeal analysis error:", err);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#171412] border border-[#3d342d] rounded-xl shadow-2xl text-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2621] bg-[#1d1815]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#4d4239] bg-[#29221d] flex items-center justify-center text-amber-500">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                <span>AI Appellate Scrutiny & Appeal Drafter</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-semibold">
                  Section 96 CPC / Sec 415 BNSS
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Judicial lifecycle appeal analysis for adverse decrees or rejected interim orders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Case Context Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg border border-[#2d2621] bg-[#13100e] text-xs">
            <div>
              <span className="text-stone-500 block text-[11px] uppercase tracking-wider">Case Number / CNR</span>
              <span className="font-mono font-semibold text-stone-200">
                {caseData?.cnr || "MHPU02-004912-2026"}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block text-[11px] uppercase tracking-wider">Impugned Court</span>
              <span className="font-semibold text-stone-200">{caseData?.court || "Civil Court, Pune"}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[11px] uppercase tracking-wider">Dispute Category</span>
              <span className="font-semibold text-stone-200">{caseData?.category || "Property & Land (Civil)"}</span>
            </div>
          </div>

          {/* Trigger Analysis Button */}
          {!analysisResult ? (
            <div className="space-y-4 py-4 text-center">
              <div className="max-w-md mx-auto space-y-3">
                <label className="block text-xs font-medium text-stone-300 text-left">
                  Nature of Impugned Judicial Order
                </label>
                <select
                  value={decreeType}
                  onChange={(e) => setDecreeType(e.target.value)}
                  className="bw-input text-xs"
                >
                  <option value="Injunction Refused / Adverse Order">Interim Injunction Refused (CPC Order 39)</option>
                  <option value="Final Suit Dismissal (Civil Decree)">Final Suit Dismissal (Civil Decree)</option>
                  <option value="Bail Application Rejected">Bail Application Rejected (BNSS Sec 480)</option>
                  <option value="Adverse Revenue Mutation Order">Adverse Revenue Demarcation / 7/12 Mutation</option>
                </select>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={analyzing}
                  className="w-full bw-btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {analyzing ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Evaluating Appellate Jurisdictions & Limitation...</span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-3.5 h-3.5" />
                      <span>Analyze Grounds of Appeal & Forum</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Forum & Limitation Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Designated Appellate Forum</span>
                  </div>
                  <p className="text-sm font-semibold text-stone-100">
                    {analysisResult.analysis.appellateForum}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Governed by: <strong className="text-stone-300">{analysisResult.analysis.statutoryProvision}</strong>
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-950/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Statutory Limitation Period</span>
                  </div>
                  <p className="text-sm font-semibold text-stone-100">
                    {analysisResult.analysis.limitationDays} Days from Date of Order
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Prescribed under: <strong className="text-stone-300">{analysisResult.analysis.limitationActArticle}</strong>
                  </p>
                </div>
              </div>

              {/* Suggested Grounds of Appeal */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Grounds of Appeal (Legal Scrutiny)</span>
                </h3>
                <div className="space-y-2">
                  {analysisResult.analysis.suggestedGrounds.map((g: string, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded border border-[#2d2621] bg-[#14110f] text-xs text-stone-300 flex items-start gap-2"
                    >
                      <span className="font-mono text-amber-500 font-bold shrink-0">
                        ({String.fromCharCode(97 + i)})
                      </span>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Appellate Annexures */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>Mandatory Documents to Accompany Appeal Memo</span>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {analysisResult.analysis.requiredDocuments.map((doc: string, idx: number) => (
                    <li
                      key={idx}
                      className="px-3 py-2 rounded border border-[#2e2722] bg-[#181412] text-stone-300 flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Formatted Memorandum of Appeal Draft */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                    Memorandum of Appeal (Draft Pleading)
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-[#3e352f] bg-[#221c18] hover:bg-[#2c241f] text-stone-300 transition-colors cursor-pointer"
                  >
                    {copiedDraft ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg border border-[#332b25] bg-[#100e0c] font-mono text-xs text-stone-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {analysisResult.appeal_draft}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#2d2621] bg-[#191512] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded border border-[#3a322c] bg-[#1a1715] hover:bg-[#25201c] text-stone-300 transition-colors cursor-pointer"
          >
            Close
          </button>

          {analysisResult && (
            <button
              type="button"
              onClick={() => {
                if (onPrepareAppeal) {
                  onPrepareAppeal({
                    category: "Civil Appellate Petition",
                    description: `Regular Civil Appeal against Impugned Order of ${caseData?.court}. Grounds: ${analysisResult.analysis.suggestedGrounds[0]}`,
                    suggested_court: analysisResult.analysis.appellateForum,
                  });
                }
                onClose();
              }}
              className="bw-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span>Load into Petition Filing Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
