/**
 * VÉRONA — Admin Global Search Command Palette (Phase 27)
 *
 * Full-screen modal / command palette with keyboard navigation (Ctrl/Cmd + K, ESC),
 * real-time debounced search across orders, products, customers, payments, refunds,
 * returns, reviews, and support tickets with permission filtering.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ShoppingBag,
  Package,
  Users,
  CreditCard,
  Receipt,
  RotateCcw,
  LifeBuoy,
  Star,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { AdminSearchResultDTO } from "@/modules/admin/types/admin.types";

interface AdminSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ORDER: ShoppingBag,
  PRODUCT: Package,
  CUSTOMER: Users,
  PAYMENT: CreditCard,
  REFUND: Receipt,
  RETURN: RotateCcw,
  TICKET: LifeBuoy,
  REVIEW: Star,
};

const TYPE_COLORS: Record<string, string> = {
  ORDER: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  PRODUCT: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CUSTOMER: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  PAYMENT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  REFUND: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  RETURN: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  TICKET: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  REVIEW: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};

export function AdminSearchModal({ isOpen, onClose }: AdminSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<AdminSearchResultDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input on open
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const navigateToResult = React.useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  // Handle ESC and Arrow key navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        navigateToResult(results[selectedIndex].href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, navigateToResult]);

  // Debounced search query
  React.useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data.results)) {
            setResults(json.data.results);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.error("Global search error", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800 gap-3">
          <Search className="h-5 w-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search orders, SKU, customers, payments, refunds, support tickets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-neutral-400 shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="p-8 text-center text-sm text-neutral-500">
              No matching records found across your authorized operational domains.
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="p-8 text-center text-xs text-neutral-400">
              Type at least 2 characters to search across orders, inventory, customers, payments, and tickets.
            </div>
          )}

          {results.map((item, idx) => {
            const Icon = TYPE_ICONS[item.type] || Package;
            const badgeClass = TYPE_COLORS[item.type] || "bg-neutral-100 text-neutral-700";
            const isSelected = idx === selectedIndex;

            return (
              <div
                key={`${item.type}-${item.reference}-${idx}`}
                onClick={() => navigateToResult(item.href)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-3 rounded flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-neutral-100 dark:bg-neutral-800/80"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded shrink-0 ${badgeClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        {item.type}
                      </span>
                      {item.status && (
                        <span className="text-[10px] px-1.5 py-0.2 font-mono bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded">
                          {item.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-neutral-400">
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <span>
            {results.length > 0 ? `${results.length} result(s)` : "Global Search"}
          </span>
          <div className="flex items-center gap-2">
            <span>Navigate with</span>
            <kbd className="px-1 py-0.5 border rounded">↑</kbd>
            <kbd className="px-1 py-0.5 border rounded">↓</kbd>
            <kbd className="px-1 py-0.5 border rounded">Enter</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
