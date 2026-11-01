"use client";

import { LogOut, MessageSquare } from "lucide-react";
import Brand from "./brand";
import { openAssistant, signOut } from "@/lib/session";

interface AppHeaderProps {
  workspace: string;
  userName?: string;
  userDetail?: string;
}

export default function AppHeader({ workspace, userName, userDetail }: AppHeaderProps) {
  const initials = (userName || "?")
    .replace(/^(adv\.|hon'ble|justice)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-line">
      <div className="container-page h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Brand />
          <span className="hidden sm:block h-6 w-px bg-line" aria-hidden />
          <span className="hidden sm:block text-sm font-medium text-ink-2 truncate">{workspace}</span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={openAssistant} className="btn btn-ghost btn-sm">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden md:inline">Legal assistant</span>
          </button>

          {userName && (
            <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-line">
              <span className="w-8 h-8 rounded-full bg-brand-soft text-brand text-xs font-semibold flex items-center justify-center">
                {initials || "?"}
              </span>
              <span className="leading-tight max-w-[180px]">
                <span className="block text-sm font-medium text-ink truncate">{userName}</span>
                {userDetail && <span className="block text-xs text-muted truncate">{userDetail}</span>}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={signOut}
            className="btn btn-ghost btn-icon"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="sm:hidden container-page pb-2 -mt-1 text-xs font-medium text-muted">{workspace}</div>
    </header>
  );
}
