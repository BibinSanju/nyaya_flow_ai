"use client";

import Link from "next/link";
import {
  Scale,
  Shield,
  FileText,
  Building2,
  UserCheck,
  ArrowRight,
  User,
  Briefcase,
  CheckCircle2,
  Upload,
  Scan,
  Lock,
  Bot
} from "lucide-react";

export default function LandingPage() {
  const roles = [
    {
      id: "citizen",
      title: "Citizen Litigant",
      roleDesc: "Petitions & Status",
      icon: User,
      summary:
        "Submit case grievances in regional languages, upload document annexures, run OCR readability checks, and track case progress.",
      href: "/citizen/dashboard",
    },
    {
      id: "advocate",
      title: "Advocate Counsel",
      roleDesc: "Legal Counsel",
      icon: Briefcase,
      summary:
        "Manage vakalatnama authorizations, inspect client filings, and prepare verified case briefs for registry submission.",
      href: "/advocate/dashboard",
    },
    {
      id: "police",
      title: "Investigating Officer",
      roleDesc: "Police Department",
      icon: Shield,
      summary:
        "Register incident narratives, reference Bharatiya Nyaya Sanhita (BNS) sections, and log digital case evidence records.",
      href: "/police/dashboard",
    },
    {
      id: "registrar",
      title: "Court Registrar",
      roleDesc: "Registry & Scrutiny",
      icon: Building2,
      summary:
        "Scrutinize incoming filings for procedural defects, allocate 16-character CNR numbers, and assign physical record shelf codes.",
      href: "/registrar/dashboard",
    },
    {
      id: "judge",
      title: "Presiding Judge",
      roleDesc: "Judicial Bench",
      icon: UserCheck,
      summary:
        "Review daily cause lists, review precedent references and statutory chronologies, and record bench orders and decrees.",
      href: "/judge/dashboard",
    },
    {
      id: "admin",
      title: "System Administrator",
      roleDesc: "System & Audit",
      icon: Lock,
      summary:
        "Audit system access logs, check district caseload distributions, and monitor server and database status.",
      href: "/admin/dashboard",
    },
  ];

  const features = [
    {
      icon: Upload,
      title: "Document Upload & Storage",
      desc: "Upload support for PDF and image documents with file validation and metadata indexing.",
    },
    {
      icon: Scan,
      title: "Text Extraction & OCR",
      desc: "Text extraction from digital PDFs and scanned images with document type classification.",
    },
    {
      icon: Lock,
      title: "Secure OTP Authentication",
      desc: "Single-use verification code access across all stakeholder portals.",
    },
    {
      icon: Scale,
      title: "Judicial Authority",
      desc: "Clear workflows ensuring court officers and judges retain full decision-making control.",
    },
  ];

  const handleOpenChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-nyayaflow-chat"));
    }
  };

  return (
    <div className="min-h-screen text-stone-100 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#161412]/90 backdrop-blur-md border-b border-[#2e2824]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#2e2824] border border-[#4a4039] text-[#e2c481] flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                NyayaFlow
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#2a2420] text-[#d4af37] border border-[#4a4039]">
                  Judicial Portal
                </span>
              </span>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Court Case & Document Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenChat}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[#3f3832] bg-[#211d1a] hover:bg-[#2b2622] text-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Court Assistant</span>
            </button>

            <Link
              href="/auth"
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#38302b] hover:bg-[#4a4039] border border-[#574b40] text-white transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-16 space-y-16">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#3f3832] bg-[#1a1715] text-xs font-medium text-stone-300">
            <span>Official Court Case Management System</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Case filing, registry scrutiny, and cause-list workflows.
          </h1>

          <p className="text-sm sm:text-base text-stone-300 leading-relaxed max-w-2xl">
            A unified portal connecting citizens, advocates, investigating officers, court registrars, and presiding judges for transparent case processing.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/auth"
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded bg-[#2e2722] hover:bg-[#3d342e] border border-[#5c4e43] text-stone-100 transition-colors inline-flex items-center gap-2"
            >
              <span>Access Workspaces</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/citizen/dashboard"
              className="px-5 py-2.5 text-xs sm:text-sm font-medium rounded border border-[#3f3832] bg-[#1a1715] hover:bg-[#26211e] text-stone-200 transition-colors"
            >
              File Citizen Grievance
            </Link>
            <button
              onClick={handleOpenChat}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium rounded border border-[#3f3832] bg-[#1a1715] hover:bg-[#26211e] text-stone-300 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[#d4af37]" />
              <span>Ask Court Assistant</span>
            </button>
          </div>
        </div>

        {/* Core System Features */}
        <section className="space-y-4">
          <div className="border-b border-[#2e2824] pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Platform Features
            </h2>
            <span className="text-[11px] text-stone-400">e-Courts Workflow</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-5 border border-[#2e2824] rounded-lg bg-[#181513] hover:border-[#423a34] transition-colors space-y-2"
                >
                  <div className="w-8 h-8 rounded bg-[#241f1c] border border-[#3a322c] flex items-center justify-center text-[#d4af37]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stakeholder Roles Grid */}
        <section className="space-y-4">
          <div className="border-b border-[#2e2824] pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Stakeholder Workspaces
            </h2>
            <span className="text-[11px] text-stone-400">Select Role to Enter</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Link
                  key={role.id}
                  href={role.href}
                  className="p-5 border border-[#2e2824] rounded-lg bg-[#181513] hover:border-[#4a4038] hover:bg-[#1e1a17] transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded bg-[#241f1c] border border-[#3a322c] flex items-center justify-center text-[#d4af37]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-stone-300 bg-[#241f1c] border border-[#332c26] px-2 py-0.5 rounded">
                        {role.roleDesc}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white">
                      {role.title}
                    </h3>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {role.summary}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center text-xs font-medium text-stone-300 gap-1.5">
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2e2824] py-6 px-6 bg-[#141210]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#d4af37]" />
            <p>© 2026 NyayaFlow Judicial Platform.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-stone-300 hover:text-white underline underline-offset-4">
              Sign In Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
