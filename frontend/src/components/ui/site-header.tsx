"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import Brand from "./brand";
import { openAssistant } from "@/lib/session";

export default function SiteHeader({ showAuthLinks = true }: { showAuthLinks?: boolean }) {
  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-line">
      <div className="container-page h-16 flex items-center justify-between gap-4">
        <Brand />
        <nav className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={openAssistant} className="btn btn-ghost btn-sm">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Legal assistant</span>
          </button>
          {showAuthLinks && (
            <>
              <Link href="/auth?mode=login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/auth?mode=register" className="btn btn-primary btn-sm">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
