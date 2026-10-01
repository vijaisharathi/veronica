"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { useRecentSearches } from "@/modules/search/recent-searches";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  initialQuery = "",
  placeholder = "Search garments, cashmere, linen, blazers, sarees, SKU...",
  autoFocus = false,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(initialQuery);
  const [isPending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { addSearch } = useRecentSearches();

  React.useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = query.trim();
    if (sanitized.length === 0) return;

    addSearch(sanitized);

    // Keep existing filters (if any) or navigate to clean query
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", sanitized);
    params.delete("page"); // Reset page on new query

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative w-full max-w-3xl mx-auto", className)}>
      <label htmlFor="catalog-search-input" className="sr-only">
        Search the VÉRONA Catalog
      </label>
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-4 w-4 text-muted-foreground select-none pointer-events-none" />
        <input
          id="catalog-search-input"
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 rounded-full border border-border bg-background pl-11 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-all dark:focus:border-white dark:focus:ring-white shadow-subtle"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {query.length > 0 && !isPending && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="h-8 px-4 rounded-full bg-neutral-900 text-white text-xs font-medium uppercase tracking-wider hover:bg-neutral-800 transition-colors dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
