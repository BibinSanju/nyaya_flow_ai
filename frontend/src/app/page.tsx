import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  FileCheck2,
  FileUp,
  Gavel,
  Lock,
  Search,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import CnrTracker from "@/components/cnr-tracker";
import SiteHeader from "@/components/ui/site-header";
import SiteFooter from "@/components/ui/site-footer";

const publicRoles = [
  {
    title: "Citizens",
    icon: User,
    summary: "Describe your dispute in your own language, upload supporting documents and follow your case to hearing.",
    href: "/auth?mode=login&role=citizen",
  },
  {
    title: "Advocates",
    icon: Briefcase,
    summary: "Receive client requests, review their documents and accept representation.",
    href: "/auth?mode=login&role=advocate",
  },
];

const officialRoles = [
  {
    title: "Police",
    icon: Shield,
    summary: "Record incident reports and get suggested BNS sections.",
    href: "/auth?mode=login&role=police",
  },
  {
    title: "Registry",
    icon: Building2,
    summary: "Check new filings for defects and issue CNR numbers.",
    href: "/auth?mode=login&role=registrar",
  },
  {
    title: "Judges",
    icon: UserCheck,
    summary: "Review the day's cause list, case briefs and record orders.",
    href: "/auth?mode=login&role=judge",
  },
  {
    title: "Administrators",
    icon: Lock,
    summary: "Monitor system health and review access logs.",
    href: "/auth?mode=login&role=admin",
  },
];

const steps = [
  {
    icon: FileUp,
    title: "File",
    desc: "Describe the dispute, pick the court and attach documents such as land records or agreements.",
  },
  {
    icon: FileCheck2,
    title: "Scrutiny",
    desc: "The registry checks the filing for missing documents or defects and issues a CNR number.",
  },
  {
    icon: Gavel,
    title: "Hearing",
    desc: "The case is listed before a judge. Orders and hearing dates appear against your CNR.",
  },
  {
    icon: Search,
    title: "Track",
    desc: "Anyone with the CNR number can check status, next hearing date and orders.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-surface border-b border-line">
          <div className="container-page py-14 sm:py-20 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">Court case management</p>
              <h1 className="heading-display mt-3 text-4xl sm:text-5xl leading-[1.1]">
                File, follow and manage court cases in one place.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-ink-2 max-w-xl leading-relaxed">
                NyayaFlow connects citizens, advocates, police, court registry and judges, so a case moves from
                complaint to hearing without paperwork getting lost.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth?mode=register" className="btn btn-primary btn-lg">
                  File a petition
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/auth?mode=login" className="btn btn-secondary btn-lg">
                  Log in
                </Link>
              </div>
            </div>

            <CnrTracker />
          </div>
        </section>

        {/* How it works */}
        <section className="container-page py-16">
          <h2 className="heading-display text-2xl">How a case moves</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-medium text-muted">Step {idx + 1}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm text-ink-2 leading-relaxed">{step.desc}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Who it's for */}
        <section className="bg-surface border-y border-line">
          <div className="container-page py-16 space-y-10">
            <div>
              <h2 className="heading-display text-2xl">Who uses NyayaFlow</h2>
              <p className="mt-2 text-sm text-muted">Each role signs in to its own workspace.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {publicRoles.map((role) => (
                <RoleCard key={role.title} {...role} />
              ))}
            </div>

            <div>
              <p className="eyebrow mb-3">Court and government officials</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {officialRoles.map((role) => (
                  <RoleCard key={role.title} {...role} compact />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-12">
          <div className="callout callout-info max-w-3xl">
            <Gavel className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              NyayaFlow uses AI to suggest courts, statutes and document checks. These suggestions are advisory —
              every filing decision and order is made by registry staff and judges.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function RoleCard({
  title,
  icon: Icon,
  summary,
  href,
  compact = false,
}: {
  title: string;
  icon: typeof User;
  summary: string;
  href: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group card flex flex-col hover:border-line-strong transition-colors ${compact ? "p-4" : "p-5"}`}
    >
      <span className="w-9 h-9 rounded-md bg-subtle text-ink-2 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-2 leading-relaxed flex-1">{summary}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand">
        Sign in
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
