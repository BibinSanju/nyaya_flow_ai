"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Activity,
  LogOut,
  Scale,
  CheckCircle,
  FileText,
  Lock,
  RefreshCw,
  Server,
  Database
} from "lucide-react";

interface AuditLog {
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  status: string;
  ip: string;
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      timestamp: "Oct 21, 2026, 3:30 PM",
      actor: "Registrar Clerk",
      role: "Registrar",
      action: "Issued official CNR MHPU01-004912-2026 and linked archival Box #102",
      status: "Success",
      ip: "127.0.0.1",
    },
    {
      timestamp: "Oct 21, 2026, 3:15 PM",
      actor: "Aditya Patil",
      role: "Citizen",
      action: "Uploaded and scanned 7/12 Land Revenue extract via OCR engine",
      status: "Success",
      ip: "127.0.0.1",
    },
    {
      timestamp: "Oct 21, 2026, 2:45 PM",
      actor: "Hon. Justice K. Verma",
      role: "Judge",
      action: "Recorded bench decree: Status Quo granted under CPC Order 39",
      status: "Success",
      ip: "127.0.0.1",
    },
    {
      timestamp: "Oct 21, 2026, 2:10 PM",
      actor: "Inspector R. Sharma",
      role: "Police",
      action: "Cross-referenced Section 305 BNS for dwelling house break-in FIR",
      status: "Success",
      ip: "127.0.0.1",
    },
    {
      timestamp: "Oct 21, 2026, 1:50 PM",
      actor: "Adv. Abhishek Deshmukh",
      role: "Advocate",
      action: "Accepted Vakalatnama representation brief for land partition filing",
      status: "Success",
      ip: "127.0.0.1",
    },
  ]);

  const [systemStatus, setSystemStatus] = useState({
    apiStatus: "Operational",
    database: "Local Persistent Storage / MongoDB Compatible",
    ocrEngine: "Active (Tesseract.js & PDF-Parse)",
    otpService: "Active (HMAC-SHA256 & Nodemailer)",
  });

  const [currentUser, setCurrentUser] = useState<{ fullName?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nyayaflow_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const handleOpenChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-nyayaflow-chat"));
    }
  };

  return (
    <div className="min-h-screen text-stone-200 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#2d2621] sticky top-0 bg-[#12100e]/95 backdrop-blur-md z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded border border-[#3e352f] bg-[#221c18] text-stone-200 flex items-center justify-center font-semibold">
                <Lock className="w-4 h-4 text-stone-300" />
              </div>
              <span className="font-semibold text-base text-stone-100 tracking-tight">NyayaFlow</span>
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-xs font-medium text-stone-400 hidden sm:inline">System Administrator Console</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Direct AI Chat Launcher */}
            <button
              onClick={handleOpenChat}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[#38302a] bg-[#1c1714] text-stone-300 hover:bg-[#25201b] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Court Assistant</span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-stone-200">
                {currentUser?.fullName
                  ? (currentUser.fullName.toLowerCase().includes("admin") ? currentUser.fullName : `Admin ${currentUser.fullName}`)
                  : "System Administrator"}
              </p>
              <p className="text-[11px] text-stone-400 font-mono">{currentUser?.email || "ADMIN-SYS-99"}</p>
            </div>
            <Link
              href="/auth"
              className="p-2 text-stone-400 hover:text-stone-200 rounded border border-[#2d2621] hover:border-[#443a33] bg-[#181513] transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#3e352f] bg-[#201b17] text-[11px] font-medium text-stone-300 mb-2">
            <Lock className="w-3 h-3 text-stone-400" />
            <span>Infrastructure & Audit Security</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Platform Infrastructure & Audit Log</h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Real-time server telemetry, document store indices, and security verification logs.
          </p>
        </div>

        {/* Infrastructure Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-[#2e2722] rounded-xl bg-[#181513]/95 space-y-1 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-400">API Server</span>
              <Server className="w-4 h-4 text-stone-400" />
            </div>
            <p className="text-base font-bold text-stone-100">{systemStatus.apiStatus}</p>
            <p className="text-[11px] text-stone-400 font-medium">Listening on port 5000</p>
          </div>

          <div className="p-4 border border-[#2e2722] rounded-xl bg-[#181513]/95 space-y-1 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-400">Database Engine</span>
              <Database className="w-4 h-4 text-stone-400" />
            </div>
            <p className="text-base font-bold text-stone-100 truncate">Active</p>
            <p className="text-[11px] text-stone-400 font-mono">Mongoose / Local Store</p>
          </div>

          <div className="p-4 border border-[#2e2722] rounded-xl bg-[#181513]/95 space-y-1 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-400">OCR & Document Scrutiny</span>
              <FileText className="w-4 h-4 text-stone-400" />
            </div>
            <p className="text-base font-bold text-stone-100">Online</p>
            <p className="text-[11px] text-stone-400">Tesseract.js & PDF-Parse</p>
          </div>

          <div className="p-4 border border-[#2e2722] rounded-xl bg-[#181513]/95 space-y-1 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-400">OTP Auth Delivery</span>
              <Lock className="w-4 h-4 text-stone-400" />
            </div>
            <p className="text-base font-bold text-stone-100">Active</p>
            <p className="text-[11px] text-stone-400">SHA-256 Rate-Limited</p>
          </div>
        </div>

        {/* Audit Trail Table */}
        <div className="border border-[#2e2722] rounded-xl p-6 sm:p-8 bg-[#181513]/95 space-y-4 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-100">Security & Transaction Log</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Every authorization, document upload, and judicial decree is permanently logged with IP and role stamps.
              </p>
            </div>
          </div>

          <div className="border border-[#2d2621] rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14110f] border-b border-[#2d2621] text-stone-400 font-semibold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Stakeholder Actor</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action Description</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26201c]">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-[#1a1614] transition-colors">
                    <td className="p-3 font-mono text-stone-400">{log.timestamp}</td>
                    <td className="p-3 font-medium text-stone-200">{log.actor}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-[#38302a] bg-[#201b17] text-stone-300">
                        {log.role}
                      </span>
                    </td>
                    <td className="p-3 text-stone-300 max-w-sm truncate">{log.action}</td>
                    <td className="p-3 font-mono text-stone-400">{log.ip}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-300">
                        <CheckCircle className="w-3.5 h-3.5 text-stone-400" /> Confirmed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#26201c] py-3.5 px-6 text-center text-xs text-stone-500 bg-[#12100e]/95 backdrop-blur-md">
        NyayaFlow System Console • Audit Integrity & Role-Based Access Control
      </footer>
    </div>
  );
}
