"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Shield, Briefcase, UserCheck, Building2, Lock, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiSendOTP, apiVerifyOTP } from "@/utils/api";
import SiteHeader from "@/components/ui/site-header";

interface RoleConfig {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  dashboardPath: string;
}

const ROLES: RoleConfig[] = [
  { id: "citizen", name: "Citizen", desc: "File and track your case", icon: User, dashboardPath: "/citizen/dashboard" },
  { id: "advocate", name: "Advocate", desc: "Represent clients", icon: Briefcase, dashboardPath: "/advocate/dashboard" },
  { id: "police", name: "Police", desc: "Incident reports", icon: Shield, dashboardPath: "/police/dashboard" },
  { id: "registrar", name: "Registry", desc: "Scrutiny and CNR", icon: Building2, dashboardPath: "/registrar/dashboard" },
  { id: "judge", name: "Judge", desc: "Cause list and orders", icon: UserCheck, dashboardPath: "/judge/dashboard" },
  { id: "admin", name: "Administrator", desc: "System and audit", icon: Lock, dashboardPath: "/admin/dashboard" },
];

const GENERIC_NAMES = ["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"];

export default function AuthPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedRole, setSelectedRole] = useState<RoleConfig>(ROLES[0]);
  const [contact, setContact] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Read ?mode= and ?role= from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "register" || mode === "signup" || mode === "signin") setAuthMode("register");
    const role = ROLES.find((r) => r.id === params.get("role"));
    if (role) setSelectedRole(role);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setOtpSent(false);
    setOtp("");
    setDevOtp(null);
    resetMessages();
  };

  const handleSendOTP = async () => {
    const email = contact.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }
    if (authMode === "register" && !fullName.trim()) {
      setErrorMessage("Enter your full name.");
      return;
    }

    setIsSendingOtp(true);
    resetMessages();

    try {
      const res = await apiSendOTP(email, "email", selectedRole.id);
      if (!res.success) throw new Error(res.error || "Could not send the code.");

      setOtpSent(true);
      setCooldown(res.cooldownSeconds || 60);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
        setOtp(res.devOtp);
      } else {
        setDevOtp(null);
        setSuccessMessage(`We sent a 6-digit code to ${res.contactMasked || email}.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not send the code. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setErrorMessage("Enter the 6-digit code.");
      return;
    }

    setIsVerifying(true);
    resetMessages();

    try {
      const nameToSend = fullName.trim() || undefined;
      const res = await apiVerifyOTP(contact.trim(), otp.trim(), selectedRole.id, nameToSend);
      if (!res.success) throw new Error(res.error || "Verification failed.");

      let stored: Record<string, any> = {};
      try {
        stored = JSON.parse(localStorage.getItem("nyayaflow_user") || "{}");
      } catch {}
      const serverName = res.user?.fullName;
      localStorage.setItem(
        "nyayaflow_user",
        JSON.stringify({
          ...stored,
          fullName:
            nameToSend ||
            (serverName && !GENERIC_NAMES.includes(serverName) ? serverName : stored.fullName) ||
            contact.split("@")[0],
          email: contact.trim(),
          phone: phone.trim() || stored.phone,
          role: selectedRole.id,
        })
      );

      setSuccessMessage("Signed in. Opening your workspace…");
      router.push(selectedRole.dashboardPath);
    } catch (err: any) {
      setErrorMessage(err.message || "That code is invalid or has expired.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader showAuthLinks={false} />

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="heading-display text-2xl">
              {authMode === "login" ? "Log in to NyayaFlow" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {authMode === "login"
                ? "We'll email you a one-time code. No password needed."
                : "Register with your email. We'll send a code to confirm it."}
            </p>
          </div>

          <div className="card">
            <form onSubmit={handleVerifyOTP} className="card-body space-y-5">
              {/* Role */}
              <fieldset disabled={otpSent}>
                <legend className="label">I am signing in as</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const selected = selectedRole.id === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedRole(role);
                          resetMessages();
                        }}
                        className={`flex flex-col items-start gap-1 p-2.5 rounded-md border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                          selected
                            ? "border-brand bg-brand-soft"
                            : "border-line hover:border-line-strong bg-surface"
                        } ${otpSent && !selected ? "opacity-50" : ""}`}
                      >
                        <Icon className={`w-4 h-4 ${selected ? "text-brand" : "text-muted"}`} />
                        <span className={`text-sm font-medium ${selected ? "text-brand-ink" : "text-ink"}`}>
                          {role.name}
                        </span>
                        <span className="text-xs text-muted leading-tight">{role.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {authMode === "register" && !otpSent && (
                <div>
                  <label htmlFor="fullName" className="label">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    className="input"
                    placeholder="As it appears on your ID"
                  />
                </div>
              )}

              {!otpSent ? (
                <div>
                  <label htmlFor="email" className="label">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSendOTP();
                      }
                    }}
                    autoComplete="email"
                    className="input"
                    placeholder="you@example.com"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-subtle text-sm">
                  <span className="text-ink-2 truncate">
                    Code sent to <strong className="font-medium text-ink">{contact}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setDevOtp(null);
                      resetMessages();
                    }}
                    className="text-sm font-medium text-brand hover:underline shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              {authMode === "register" && !otpSent && (
                <div>
                  <label htmlFor="phone" className="label">
                    Phone number <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    className="input"
                    placeholder="+91 98765 43210"
                  />
                </div>
              )}

              {otpSent && (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="otp" className="label">6-digit code</label>
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isSendingOtp || cooldown > 0}
                      className="text-xs font-medium text-brand hover:underline disabled:text-muted disabled:no-underline cursor-pointer disabled:cursor-default mb-1.5"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                  </div>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="input text-center font-mono text-xl tracking-[0.4em] h-12"
                    autoFocus
                  />
                  <p className="hint">The code expires in 10 minutes and can be used once.</p>
                </div>
              )}

              {devOtp && (
                <div className="callout callout-warning">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Email delivery isn&apos;t configured, so the code was filled in for you:{" "}
                    <span className="font-mono font-semibold">{devOtp}</span>
                  </span>
                </div>
              )}

              {errorMessage && (
                <div className="callout callout-error" role="alert">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="callout callout-success" role="status">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {otpSent ? (
                <button type="submit" disabled={isVerifying || otp.length !== 6} className="btn btn-primary btn-lg w-full">
                  {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isVerifying ? "Verifying…" : authMode === "login" ? "Log in" : "Create account"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isSendingOtp}
                  className="btn btn-primary btn-lg w-full"
                >
                  {isSendingOtp && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSendingOtp ? "Sending code…" : "Send code"}
                </button>
              )}
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            {authMode === "login" ? "New to NyayaFlow? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(authMode === "login" ? "register" : "login")}
              className="font-medium text-brand hover:underline cursor-pointer"
            >
              {authMode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>

          {selectedRole.id !== "citizen" && selectedRole.id !== "advocate" && (
            <p className="mt-3 text-center text-xs text-muted">
              Official accounts are for authorised court, police and government staff only.
            </p>
          )}

          <p className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
