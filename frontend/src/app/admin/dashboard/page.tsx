"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, AlertCircle, Bot, Database, Mail, RefreshCw, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiHealth, apiListPetitions } from "@/utils/api";
import AppHeader from "@/components/ui/app-header";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { getStoredUser, type StoredUser } from "@/lib/session";

interface Health {
  status?: string;
  database?: string;
  supabaseConfigured?: boolean;
  groqAi?: string;
  emailService?: string;
  ocr?: string;
  timestamp?: string;
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setHealthError(null);
    const [h, p] = await Promise.allSettled([apiHealth(), apiListPetitions()]);
    if (h.status === "fulfilled") setHealth(h.value);
    else setHealthError(h.reason?.message || "Backend is not responding.");
    if (p.status === "fulfilled" && Array.isArray(p.value)) setPetitions(p.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    refresh();
  }, [refresh]);

  const counts = {
    total: petitions.length,
    pending: petitions.filter((p) => !p.cnr_number && p.status !== "Returned").length,
    defects: petitions.filter((p) => p.status === "Returned").length,
    listed: petitions.filter((p) => p.cnr_number).length,
  };

  const emailDemo = /demo/i.test(health?.emailService || "");
  const emailOk = /^Email via/i.test(health?.emailService || "") || emailDemo;
  const aiOk = health?.groqAi ? !/offline/i.test(health.groqAi) : false;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader workspace="Administration" userName={currentUser?.fullName} userDetail={currentUser?.email} />

      <main className="container-page py-6 sm:py-8 flex-1 w-full space-y-6">
        <PageHeader
          title="System overview"
          description="Service health and filing volumes."
          actions={
            <button type="button" onClick={refresh} disabled={loading} className="btn btn-secondary">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          }
        />

        {healthError && (
          <div className="callout callout-error">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{healthError}</span>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Services</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ServiceCard icon={Activity} label="API" ok={health?.status === "healthy"} detail={health ? "Responding" : "No response"} loading={loading} />
            <ServiceCard icon={Database} label="Database" ok={!!health?.supabaseConfigured} detail={health?.supabaseConfigured ? "Supabase connected" : "Not configured — data is not saved"} loading={loading} />
            <ServiceCard icon={Mail} label="Sign-in codes" ok={emailOk} detail={emailDemo ? "Demo mode — shown on screen" : emailOk ? "Sent by email" : "Email selected but not configured"} loading={loading} />
            <ServiceCard icon={Bot} label="AI assistant" ok={aiOk} detail={aiOk ? "Groq connected" : "Offline answers only"} loading={loading} />
          </div>
          {health?.timestamp && (
            <p className="hint">Last checked {new Date(health.timestamp).toLocaleTimeString("en-IN")}</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Filings</h2>
          <dl className="grid gap-px grid-cols-2 lg:grid-cols-4 bg-line border border-line rounded-lg overflow-hidden">
            <Stat label="Total petitions" value={counts.total} />
            <Stat label="Awaiting scrutiny" value={counts.pending} />
            <Stat label="Returned with defects" value={counts.defects} />
            <Stat label="CNR issued" value={counts.listed} />
          </dl>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Audit log</h2>
          </div>
          <EmptyState
            icon={ScrollText}
            title="Audit log not available yet"
            description="Actions are recorded in the audit_logs table in Supabase. A viewer here is not built yet."
          />
        </section>
      </main>
    </div>
  );
}

function ServiceCard({
  icon: Icon,
  label,
  ok,
  detail,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  ok: boolean;
  detail: string;
  loading: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Icon className="w-4 h-4 text-muted" />
          {label}
        </span>
        {!loading && (
          <span className={`badge ${ok ? "badge-success" : "badge-warning"}`}>{ok ? "OK" : "Attention"}</span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">{loading ? "Checking…" : detail}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}
