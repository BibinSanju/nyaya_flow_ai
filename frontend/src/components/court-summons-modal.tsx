"use client";

import { useState, useEffect } from "react";
import { Printer, Copy, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { apiGenerateSummons } from "@/utils/api";

interface CourtSummonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  petition?: {
    id?: string;
    cnr_number?: string;
    citizen_name?: string;
    category?: string;
    description?: string;
    suggested_court?: string;
    opposite_party_name?: string;
    opposite_party_address?: string;
  };
}

export default function CourtSummonsModal({
  isOpen,
  onClose,
  petition,
}: CourtSummonsModalProps) {
  const [loading, setLoading] = useState(false);
  const [summons, setSummons] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form inputs for summoning
  const [cnr, setCnr] = useState(petition?.cnr_number || "");
  const [petitioner, setPetitioner] = useState(petition?.citizen_name || "");
  const [oppositeParty, setOppositeParty] = useState(petition?.opposite_party_name || "");
  const [address, setAddress] = useState(petition?.opposite_party_address || "");
  const [hearingDate, setHearingDate] = useState("");
  const [courtName, setCourtName] = useState(petition?.suggested_court || "");
  const [causeTitle, setCauseTitle] = useState(petition?.category || "");

  useEffect(() => {
    if (petition) {
      if (petition.cnr_number) setCnr(petition.cnr_number);
      if (petition.citizen_name) setPetitioner(petition.citizen_name);
      if (petition.suggested_court) setCourtName(petition.suggested_court);
      if (petition.category) setCauseTitle(petition.category);
    }
  }, [petition]);

  const handleGenerate = async () => {
    if (!cnr.trim() || !oppositeParty.trim() || !address.trim() || !hearingDate.trim()) {
      setError("Fill in the CNR, opposite party, address and hearing date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiGenerateSummons({
        petition_id: petition?.id,
        cnr_number: cnr,
        petitioner_name: petitioner,
        opposite_party_name: oppositeParty,
        opposite_party_address: address,
        hearing_date: hearingDate,
        court_name: courtName,
        cause_title: causeTitle,
      });
      if (!res.success) throw new Error(res.error || "Could not prepare the summons.");
      setSummons(res);
    } catch (err: any) {
      setError(err?.message || "Could not prepare the summons. Only registry staff, judges and advocates can issue summons.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setPrinted(true);
    window.print();
    setTimeout(() => setPrinted(false), 2000);
  };

  const handleCopyHash = () => {
    if (summons?.sec_63_bsa_certificate_hash) {
      navigator.clipboard.writeText(summons.sec_63_bsa_certificate_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Court summons"
      description="Prepare a summons to the opposite party. It becomes valid only once signed and sealed by the court."
      footer={
        summons ? (
          <>
            <button type="button" onClick={() => setSummons(null)} className="btn btn-secondary">
              Edit details
            </button>
            <button type="button" onClick={handlePrint} className="btn btn-primary">
              <Printer className="w-4 h-4" />
              {printed ? "Printing…" : "Print"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleGenerate} disabled={loading} className="btn btn-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Preparing…" : "Prepare summons"}
            </button>
          </>
        )
      }
    >
      {!summons ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CNR number" id="sm-cnr">
              <input id="sm-cnr" value={cnr} onChange={(e) => setCnr(e.target.value)} className="input font-mono" placeholder="MHPU02-004912-2026" />
            </Field>
            <Field label="Court" id="sm-court">
              <input id="sm-court" value={courtName} onChange={(e) => setCourtName(e.target.value)} className="input" />
            </Field>
            <Field label="Petitioner / plaintiff" id="sm-pet">
              <input id="sm-pet" value={petitioner} onChange={(e) => setPetitioner(e.target.value)} className="input" />
            </Field>
            <Field label="Opposite party / defendant" id="sm-opp">
              <input id="sm-opp" value={oppositeParty} onChange={(e) => setOppositeParty(e.target.value)} className="input" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address for service" id="sm-addr">
                <input id="sm-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
              </Field>
            </div>
            <Field label="Hearing date and time" id="sm-date">
              <input id="sm-date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} className="input" placeholder="e.g. 18 Nov 2026, 10:30 AM" />
            </Field>
            <Field label="Nature of case" id="sm-title">
              <input id="sm-title" value={causeTitle} onChange={(e) => setCauseTitle(e.target.value)} className="input" />
            </Field>
          </div>
          {error && (
            <div className="callout callout-error" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div id="printable-summons" className="border border-line-strong rounded-lg p-6 sm:p-8 bg-surface font-serif text-ink space-y-5">
            <p className="text-center font-sans text-xs font-semibold uppercase tracking-wider text-danger">
              Draft — not valid until signed and sealed by the court
            </p>
            <div className="text-center border-b border-ink pb-4">
              <h3 className="text-lg font-semibold uppercase">In the court of {summons.court_name}</h3>
              <p className="mt-1 font-sans text-xs text-muted">Summons to defendant · Order V, Rules 1 &amp; 5, CPC</p>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-xs">
              <div>
                <dt className="text-muted">CNR</dt>
                <dd className="font-mono font-medium">{summons.cnr_number}</dd>
              </div>
              <div>
                <dt className="text-muted">Notice ID</dt>
                <dd className="font-mono font-medium">{summons.notice_id}</dd>
              </div>
              <div>
                <dt className="text-muted">Issued</dt>
                <dd className="font-medium">{summons.issued_date}</dd>
              </div>
              <div>
                <dt className="text-muted">Speed Post no.</dt>
                <dd className="font-mono font-medium">{summons.speed_post_tracking_no || "—"}</dd>
              </div>
            </dl>

            <div className="font-sans text-sm space-y-2">
              <p>
                <span className="text-muted">Petitioner: </span>
                <strong>{summons.parties?.petitioner}</strong>
              </p>
              <p className="text-muted text-xs">versus</p>
              <p>
                <span className="text-muted">To: </span>
                <strong>{summons.parties?.opposite_party}</strong>
                <br />
                <span className="text-ink-2">{summons.parties?.service_address}</span>
              </p>
            </div>

            <div className="text-sm leading-relaxed space-y-3">
              <p><strong>Re:</strong> {summons.cause_title}</p>
              <p>{summons.statutory_directive}</p>
              <p className="border-l-2 border-danger pl-3">{summons.consequence_of_non_appearance}</p>
              <p><strong>Date of appearance:</strong> {summons.hearing_date}</p>
              <p><strong>Written statement due:</strong> {summons.response_deadline}</p>
            </div>

            <div className="pt-4 border-t border-line font-sans text-xs text-muted flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              {summons.sec_63_bsa_certificate_hash && (
                <div className="min-w-0">
                  <p>Document fingerprint (SHA-256)</p>
                  <p className="font-mono text-[10px] break-all text-ink-2">{summons.sec_63_bsa_certificate_hash}</p>
                </div>
              )}
              <div className="sm:text-right shrink-0">
                <div className="h-12 w-48 border-b border-ink-2 sm:ml-auto" />
                <p className="mt-1">{summons.seal_authority || "Signature and seal of the court"}</p>
              </div>
            </div>
          </div>

          {summons.sec_63_bsa_certificate_hash && (
            <button type="button" onClick={handleCopyHash} className="btn btn-ghost btn-sm">
              {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? "Fingerprint copied" : "Copy fingerprint"}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
    </div>
  );
}
