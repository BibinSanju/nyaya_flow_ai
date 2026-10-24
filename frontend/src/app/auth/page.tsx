"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Shield,
  Briefcase,
  UserCheck,
  Building2,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  Scale,
  Sparkles,
  LogIn,
  UserPlus,
  KeyRound
} from "lucide-react";
import { apiSendOTP, apiVerifyOTP, apiAuthLogin } from "@/utils/api";

interface RoleConfig {
  id: string;
  name: string;
  desc: string;
  icon: any;
  dashboardPath: string;
}

export default function AuthPage() {
  const router = useRouter();

  const publicRoles: RoleConfig[] = [
    {
      id: "citizen",
      name: "Citizen",
      desc: "File and track petitions, upload documents, and seek legal aid",
      icon: User,
      dashboardPath: "/citizen/dashboard",
    },
    {
      id: "advocate",
      name: "Advocate",
      desc: "Manage vakalatnama briefs, client representation, and court filings",
      icon: Briefcase,
      dashboardPath: "/advocate/dashboard",
    },
  ];

  const institutionalRoles: RoleConfig[] = [
    {
      id: "police",
      name: "Police Officer",
      desc: "Register FIR narratives, chargesheets, and forensic hashes",
      icon: Shield,
      dashboardPath: "/police/dashboard",
    },
    {
      id: "registrar",
      name: "Court Registrar",
      desc: "Audit case filings, scrutinize defects, and issue official CNR numbers",
      icon: Building2,
      dashboardPath: "/registrar/dashboard",
    },
    {
      id: "judge",
      name: "Presiding Judge",
      desc: "Review cause lists, inspect case briefs, and sign judicial bench orders",
      icon: UserCheck,
      dashboardPath: "/judge/dashboard",
    },
    {
      id: "admin",
      name: "System Administrator",
      desc: "Review platform audit logs, security telemetry, and access policies",
      icon: Lock,
      dashboardPath: "/admin/dashboard",
    },
  ];

  const allRoles = [...publicRoles, ...institutionalRoles];

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedRole, setSelectedRole] = useState<RoleConfig>(publicRoles[0]);
  const [contact, setContact] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Sync mode from URL query parameter (?mode=login vs ?mode=register or ?mode=signin)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      if (mode === "register" || mode === "signup" || mode === "signin") {
        setAuthMode("register");
      } else if (mode === "login") {
        setAuthMode("login");
      }
    }
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: any = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSelectRole = (role: RoleConfig) => {
    setSelectedRole(role);
    setOtp("");
    setDevOtp(null);
    setOtpSent(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSendOTP = async () => {
    if (!contact.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    if (!contact.includes("@") || contact.trim().length < 5) {
      setErrorMessage("Please enter a valid email address (e.g. yourname@gmail.com).");
      return;
    }

    if (authMode === "register" && !fullName.trim()) {
      setErrorMessage("Please enter your Full Name or Legal Designation to register.");
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const type = "email";
      const res = await apiSendOTP(contact.trim(), type, selectedRole.id);

      if (res.success) {
        setOtpSent(true);
        setCooldown(res.cooldownSeconds || 60);
        if (res.devOtp) {
          setDevOtp(res.devOtp);
          setOtp(res.devOtp);
          setSuccessMessage(
            `Verification Code Generated: ${res.devOtp} (Auto-filled below). To receive direct inbox delivery, set SMTP_USER & SMTP_PASS in backend/.env`
          );
        } else {
          setDevOtp(null);
          setSuccessMessage(
            `Verification code sent to ${res.contactMasked || contact}. Please check your email inbox.`
          );
        }
      } else {
        throw new Error(res.error || "Failed to send OTP");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not generate OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nameToSend = fullName.trim() || undefined;
      const res = await apiVerifyOTP(contact, otp.trim(), selectedRole.id, nameToSend);

      if (res.success) {
        if (typeof window !== "undefined") {
          let stored: any = {};
          try {
            stored = JSON.parse(localStorage.getItem("nyayaflow_user") || "{}");
          } catch (e) {}

          const rawAadhaar = aadhaar.replace(/\D/g, "");
          const maskedAadhaar =
            rawAadhaar.length >= 4
              ? `•••• •••• ${rawAadhaar.slice(-4)}`
              : stored.idProof;

          localStorage.setItem(
            "nyayaflow_user",
            JSON.stringify({
              ...stored,
              fullName:
                nameToSend ||
                (res.user?.fullName &&
                !["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"].includes(res.user.fullName)
                  ? res.user.fullName
                  : stored.fullName &&
                    !["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"].includes(stored.fullName)
                  ? stored.fullName
                  : stored.name &&
                    !["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"].includes(stored.name)
                  ? stored.name
                  : (contact.includes("@") ? contact.split("@")[0] : "Litigant")),
              email: contact.includes("@") ? contact.trim() : stored.email,
              phone: phone.trim() ? phone.trim() : stored.phone,
              idProof: maskedAadhaar || stored.idProof,
            })
          );
        }

        setSuccessMessage(
          authMode === "login"
            ? "Log In verified successfully. Redirecting to workspace..."
            : "Sign In & Registration verified. Redirecting to workspace..."
        );
        setTimeout(() => {
          router.push(selectedRole.dashboardPath);
        }, 500);
      } else {
        throw new Error(res.error || "Verification failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Instant direct login without waiting for email
  const handleQuickLogin = async () => {
    if (!contact.trim()) {
      setErrorMessage("Please enter your registered email address to log in.");
      return;
    }

    if (!contact.includes("@") || contact.trim().length < 5) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsQuickLoggingIn(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const userName = fullName.trim() || undefined;
      const res = await apiAuthLogin(contact.trim(), userName, selectedRole.id, phone.trim() || undefined);

      if (res.token) {
        if (typeof window !== "undefined") {
          let stored: any = {};
          try {
            stored = JSON.parse(localStorage.getItem("nyayaflow_user") || "{}");
          } catch (e) {}

          const rawAadhaar = aadhaar.replace(/\D/g, "");
          const maskedAadhaar =
            rawAadhaar.length >= 4
              ? `•••• •••• ${rawAadhaar.slice(-4)}`
              : stored.idProof;

          localStorage.setItem(
            "nyayaflow_user",
            JSON.stringify({
              ...stored,
              fullName:
                userName ||
                (res.full_name &&
                !["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"].includes(res.full_name)
                  ? res.full_name
                  : stored.fullName &&
                    !["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"].includes(stored.fullName)
                  ? stored.fullName
                  : stored.name &&
                    !["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"].includes(stored.name)
                  ? stored.name
                  : (contact.includes("@") ? contact.split("@")[0] : "Litigant")),
              email: contact.trim(),
              phone: phone.trim() ? phone.trim() : stored.phone,
              idProof: maskedAadhaar || stored.idProof,
            })
          );
        }

        setSuccessMessage(`Logged in successfully as ${selectedRole.name}. Redirecting...`);
        setTimeout(() => {
          router.push(selectedRole.dashboardPath);
        }, 400);
      } else {
        throw new Error(res.error || "Log in failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Log in failed. Please check credentials or try OTP login.");
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  const handleOpenChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-nyayaflow-chat"));
    }
  };

  return (
    <div className="min-h-screen text-stone-200 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-[#12100e]/95 backdrop-blur-md border-b border-[#2d2621] py-3.5 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded border border-[#3e352f] bg-[#221c18] text-stone-200 flex items-center justify-center font-bold">
            <Scale className="w-4 h-4 text-stone-300" />
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight text-stone-100">NyayaFlow</span>
            <span className="text-xs text-stone-400 font-mono hidden sm:inline ml-2">Official Judicial Portal</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenChat}
            className="px-3 py-1.5 text-xs font-medium rounded border border-[#38302a] bg-[#1c1714] text-stone-300 hover:bg-[#25201b] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Court Assistant</span>
          </button>

          <Link
            href="/"
            className="text-xs text-stone-400 hover:text-stone-200 inline-flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-stone-800/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-xl border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 backdrop-blur-md space-y-6 shadow-xl shadow-black/40">
          
          {/* Dual-Mode Selector: Log In vs Sign In / Register */}
          <div className="flex border border-[#2e2722] p-1 rounded-lg bg-[#14110f] gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrorMessage(null);
                setSuccessMessage(null);
                setOtpSent(false);
                setOtp("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === "login"
                  ? "bg-[#28211c] text-stone-100 shadow border border-[#443a33]"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-amber-500/90" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setErrorMessage(null);
                setSuccessMessage(null);
                setOtpSent(false);
                setOtp("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === "register"
                  ? "bg-[#28211c] text-stone-100 shadow border border-[#443a33]"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-stone-300" />
              <span>Sign In / Register</span>
            </button>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#3e352f] bg-[#201b17] text-[11px] font-medium text-stone-300 mb-2.5">
              <Lock className="w-3 h-3 text-stone-400" />
              <span>
                {authMode === "login" ? "Portal Access • Log In" : "Court Verification Protocol • Sign In"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-stone-100 tracking-tight">
              {authMode === "login" ? "Portal Log In" : "Sign In & Identity Registration"}
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              {authMode === "login"
                ? "Select your judicial role and log in to your verified court workspace."
                : "Register your judicial credentials and generate single-use verification code."}
            </p>
          </div>

          {/* Role Selector Groups */}
          <div className="space-y-3">
            {/* 1. Public Access */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Public Access
                </span>
                <span className="text-[10px] text-stone-400">Citizens & Legal Counsel</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {publicRoles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole.id === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectRole(role)}
                      className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "border-amber-500/80 bg-[#28211b] text-stone-100 font-semibold ring-1 ring-amber-500/40"
                          : "border-[#2d2621] hover:border-[#443a33] bg-[#14110f] text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-amber-500/60 bg-amber-950/60 text-amber-400" : "border-[#382e26] bg-[#1e1916] text-stone-400"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight text-stone-200">{role.name}</p>
                        <p className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">{role.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Authorized Institutional Access */}
            <div className="space-y-1.5 pt-2 border-t border-[#2d2621]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Authorized Institutional Access
                </span>
                <span className="text-[10px] text-stone-400">Courts, Police & Administration</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {institutionalRoles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole.id === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectRole(role)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-emerald-500/80 bg-[#16231c] text-stone-100 font-semibold ring-1 ring-emerald-500/40"
                          : "border-[#2d2621] hover:border-[#443a33] bg-[#14110f] text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? "text-emerald-400" : "text-stone-500"}`} />
                      <div>
                        <p className="text-[11px] font-semibold leading-tight text-stone-200">{role.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Role Description Callout */}
          <div className="p-3 bg-[#1c1815] border border-[#2d2621] rounded-lg text-xs text-stone-400 leading-relaxed">
            <strong className="text-stone-200 font-semibold">{selectedRole.name}:</strong> {selectedRole.desc}
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {/* Full Name input is shown for Registration / Sign In */}
            {authMode === "register" ? (
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Full Name / Legal Designation <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bw-input"
                  placeholder="e.g. Adv. Abhishek Deshmukh / Aditya Patil"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                {authMode === "login" ? "Registered Email Address" : "Email Address for Account & Verification"} <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  disabled={otpSent}
                  required
                  className="bw-input"
                  placeholder="Enter your email address"
                />
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isSendingOtp || cooldown > 0}
                  className="px-4 py-2 text-xs font-semibold bg-[#26201c] hover:bg-[#302924] text-stone-100 border border-[#3e352f] rounded-lg shrink-0 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isSendingOtp ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : cooldown > 0 ? (
                    `Resend (${cooldown}s)`
                  ) : otpSent ? (
                    "Resend Code"
                  ) : (
                    "Send Code"
                  )}
                </button>
              </div>
            </div>

            {/* Optional Phone and Masked Aadhaar on Registration */}
            {authMode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Phone Number <span className="text-stone-500 font-normal">(Optional • For eCourts SMS Updates)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bw-input"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-stone-300">
                      Aadhaar Number <span className="text-stone-500 font-normal">(Optional • Masked § 63 BSA)</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">UIDAI Privacy Masked</span>
                  </div>
                  <input
                    type="text"
                    maxLength={14}
                    value={aadhaar}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                      const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                      setAadhaar(formatted);
                    }}
                    className="bw-input font-mono"
                    placeholder="XXXX XXXX XXXX (12 digits)"
                  />
                  {aadhaar.replace(/\D/g, "").length >= 4 && (
                    <p className="text-[10px] text-stone-400 mt-1 font-mono">
                      Masked display preview: <strong className="text-amber-300">•••• •••• {aadhaar.replace(/\D/g, "").slice(-4)}</strong> (Full number is never revealed)
                    </p>
                  )}
                </div>
              </>
            )}

            {/* OTP Input Field */}
            {otpSent && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-stone-300">
                    Enter 6-Digit Verification Code
                  </label>
                  {devOtp && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#221c18] text-stone-300 border border-[#3e352f] font-medium">
                      Code: {devOtp}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold p-2.5 border border-[#443a33] focus:border-stone-400 rounded-lg focus:outline-none bg-[#110f0d] text-stone-100"
                  autoFocus
                />
                <p className="text-[11px] text-stone-500 text-center">
                  Single-use security token valid for 10 minutes.
                </p>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bw-callout-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bw-callout-success">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              {otpSent ? (
                <button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="w-full bw-btn-primary py-2.5 text-sm font-semibold"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Security Token...</span>
                    </>
                  ) : (
                    <>
                      <span>{authMode === "login" ? "Verify & Log In" : "Verify & Sign In"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={isSendingOtp}
                    className="w-full bw-btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {isSendingOtp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>{authMode === "login" ? "Log In with Security OTP" : "Request Verification Code"}</span>
                      </>
                    )}
                  </button>

                  {/* Quick Direct Log In Option for existing accounts */}
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={handleQuickLogin}
                      disabled={isQuickLoggingIn}
                      className="w-full py-2.5 text-xs font-semibold rounded-lg bg-[#221c18] hover:bg-[#2b241f] border border-[#3e352f] text-stone-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isQuickLoggingIn ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Authenticating Workspace...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-3.5 h-3.5 text-amber-500" />
                          <span>Quick Direct Log In as {selectedRole.name}</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>

          {/* Toggle between Log In and Sign In */}
          <div className="pt-2 border-t border-[#26201c] text-center text-xs text-stone-400">
            {authMode === "login" ? (
              <p>
                Don&apos;t have a verified account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setOtpSent(false);
                    setOtp("");
                  }}
                  className="text-stone-200 hover:text-white font-medium underline underline-offset-4 cursor-pointer"
                >
                  Sign In / Register here
                </button>
              </p>
            ) : (
              <p>
                Already registered in the judicial registry?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setOtpSent(false);
                    setOtp("");
                  }}
                  className="text-stone-200 hover:text-white font-medium underline underline-offset-4 cursor-pointer"
                >
                  Log In here
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow • Judicial Workflow and Case Management System
      </footer>
    </div>
  );
}
