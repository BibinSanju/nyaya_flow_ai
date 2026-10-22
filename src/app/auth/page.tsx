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
  Sparkles
} from "lucide-react";
import { apiSendOTP, apiVerifyOTP } from "@/utils/api";

interface RoleConfig {
  id: string;
  name: string;
  desc: string;
  icon: any;
  dashboardPath: string;
}

export default function AuthPage() {
  const router = useRouter();

  const roles: RoleConfig[] = [
    {
      id: "citizen",
      name: "Citizen Litigant",
      desc: "File and track petitions, upload documents",
      icon: User,
      dashboardPath: "/citizen/dashboard",
    },
    {
      id: "advocate",
      name: "Advocate Counsel",
      desc: "Manage vakalatnama briefs and client representation",
      icon: Briefcase,
      dashboardPath: "/advocate/dashboard",
    },
    {
      id: "police",
      name: "Police Officer",
      desc: "Register FIR narratives and forensic hashes",
      icon: Shield,
      dashboardPath: "/police/dashboard",
    },
    {
      id: "registrar",
      name: "Court Registrar",
      desc: "Audit case filings and issue official CNR numbers",
      icon: Building2,
      dashboardPath: "/registrar/dashboard",
    },
    {
      id: "judge",
      name: "Presiding Judge",
      desc: "Review cause lists and sign judicial bench orders",
      icon: UserCheck,
      dashboardPath: "/judge/dashboard",
    },
    {
      id: "admin",
      name: "System Administrator",
      desc: "Review platform audit logs and system telemetry",
      icon: Lock,
      dashboardPath: "/admin/dashboard",
    },
  ];

  const [selectedRole, setSelectedRole] = useState<RoleConfig>(roles[0]);
  const [contact, setContact] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [devOtp, setDevOtp] = useState<string | null>(null);

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
      setErrorMessage("Please enter your email address to receive your 6-digit OTP.");
      return;
    }

    if (!contact.includes("@") || contact.trim().length < 5) {
      setErrorMessage("Please enter a valid email address (e.g. yourname@gmail.com).");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your Full Name or Legal Title before requesting an OTP.");
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
            `Security Code Generated: ${res.devOtp} (Auto-filled below). To receive direct emails in your personal Gmail inbox, configure SMTP_USER & SMTP_PASS in backend/.env`
          );
        } else {
          setDevOtp(null);
          setSuccessMessage(
            `Security code sent to ${res.contactMasked || contact}. Please check your email inbox.`
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
      const res = await apiVerifyOTP(contact, otp.trim(), selectedRole.id, fullName);

      if (res.success) {
        setSuccessMessage("Authentication confirmed. Redirecting to workspace...");
        setTimeout(() => {
          router.push(selectedRole.dashboardPath);
        }, 600);
      } else {
        throw new Error(res.error || "Verification failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setIsVerifying(false);
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
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#3e352f] bg-[#201b17] text-[11px] font-medium text-stone-300 mb-2.5">
              <Lock className="w-3 h-3 text-stone-400" />
              <span>Court Verification Protocol</span>
            </div>
            <h1 className="text-xl font-bold text-stone-100 tracking-tight">Portal Authentication</h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Select your judicial role and authenticate using a single-use verification code.
            </p>
          </div>

          {/* Role Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-300 uppercase tracking-wider">Designated Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole.id === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role)}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-[#6e5f54] bg-[#26201c] text-stone-100 font-semibold ring-1 ring-[#6e5f54]/50"
                        : "border-[#2d2621] hover:border-[#443a33] bg-[#14110f] text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${isSelected ? "text-stone-200" : "text-stone-500"}`} />
                    <div>
                      <p className="text-xs leading-tight">{role.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Description Callout */}
          <div className="p-3 bg-[#1c1815] border border-[#2d2621] rounded-lg text-xs text-stone-400 leading-relaxed">
            <strong className="text-stone-200 font-semibold">{selectedRole.name}:</strong> {selectedRole.desc}
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Full Name / Legal Designation
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bw-input"
                placeholder="Enter your full name or legal title"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Registered Email Address
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
            <div className="pt-2">
              {otpSent ? (
                <button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="w-full bw-btn-primary py-2.5 text-sm font-semibold"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Access Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isSendingOtp}
                  className="w-full bw-btn-primary py-2.5 text-sm font-semibold"
                >
                  {isSendingOtp ? "Generating Verification Code..." : "Request Verification Code"}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow • Judicial Workflow and Case Management System
      </footer>
    </div>
  );
}
