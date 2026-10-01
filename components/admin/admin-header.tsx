/**
 * VÉRONA — Admin Layout Header & Search Integration (Phase 27)
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
import { AdminSearchModal } from "./admin-search-modal";

interface AdminHeaderProps {
  staffEmail?: string;
  staffRole?: string;
}

export function AdminHeader({ staffEmail, staffRole }: AdminHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-14 border-b border-border bg-background px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground tracking-wide">
              Operations Portal
            </span>
          </div>

          <div className="hidden sm:block text-neutral-300 dark:text-neutral-700">/</div>

          {/* Quick search input button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search system...</span>
            <kbd className="px-1 py-0.2 text-[10px] font-mono border rounded bg-background">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-foreground"
          >
            Storefront
            <ExternalLink className="h-3 w-3" />
          </Link>

          <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">|</span>

          <span>{staffEmail ?? "dev-admin@verona.internal"}</span>

          {staffRole && (
            <span className="px-1.5 py-0.5 font-semibold text-primary uppercase text-[10px] tracking-wider bg-neutral-100 dark:bg-neutral-800 rounded">
              {staffRole}
            </span>
          )}
        </div>
      </header>

      <AdminSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
