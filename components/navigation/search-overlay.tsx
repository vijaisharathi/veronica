"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, Clock, ArrowRight, Loader2, Sparkles, Folder, Layers } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ROUTES } from "@/config/routes";
import { useRecentSearches } from "@/modules/search/recent-searches";
import { SearchSuggestionPayload, SearchSuggestionItem } from "@/modules/search/search.types";

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function SearchOverlay({ isOpen, onClose, triggerRef }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [suggestionData, setSuggestionData] = React.useState<SearchSuggestionPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const { recentSearches, isLoaded: isRecentLoaded, addSearch, removeSearch, clearSearches } = useRecentSearches();

  // Restore focus to trigger when closing
  const handleClose = React.useCallback(() => {
    onClose();
    if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [onClose, triggerRef]);

  // Navigate to query and record search
  const navigateToSearch = React.useCallback(
    (searchTerm: string) => {
      const sanitized = searchTerm.trim();
      if (sanitized.length > 0) {
        addSearch(sanitized);
        handleClose();
        router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(sanitized)}`);
      }
    },
    [addSearch, handleClose, router]
  );

  // Handle Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestionData?.suggestions[selectedIndex]) {
      const selected = suggestionData.suggestions[selectedIndex];
      addSearch(query);
      handleClose();
      router.push(selected.href);
      return;
    }
    navigateToSearch(query);
  };

  // Keyboard navigation: Escape closes overlay, Arrows navigate suggestions
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      const itemsCount = suggestionData?.suggestions.length || 0;
      if (itemsCount === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < itemsCount - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : itemsCount - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, suggestionData]);

  // Auto-focus input on open
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setSuggestionData(null);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Debounced API fetch for suggestions with AbortController
  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSuggestionData(null);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}&limit=8`, {
          signal: controller.signal,
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.data) {
            setSuggestionData(resJson.data);
            setSelectedIndex(-1);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          // Fallback or non-fatal
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const allSuggestions: SearchSuggestionItem[] = suggestionData?.suggestions || [];
  const productSuggestions = allSuggestions.filter((s) => s.type === "product");
  const categorySuggestions = suggestionData?.categories || [];
  const collectionSuggestions = suggestionData?.collections || [];

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} maxWidth="2xl">
      <div className="space-y-6">
        {/* Search Input Box Form */}
        <form onSubmit={handleSubmit} className="relative">
          <label htmlFor="header-search-overlay-input" className="sr-only">
            Search garments and collections
          </label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 select-none" />
          <input
            id="header-search-overlay-input"
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={isOpen && Boolean(suggestionData)}
            aria-autocomplete="list"
            aria-controls="search-suggestions-list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search silhouettes, blazers, linen, cashmere, SKU..."
            className="w-full rounded-full border border-neutral-300 bg-neutral-50 px-12 py-3.5 text-sm text-foreground placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-all dark:bg-neutral-800 dark:border-neutral-700"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
            {query.length > 0 && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestionData(null);
                  inputRef.current?.focus();
                }}
                className="rounded-full p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-white focus:outline-none"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* State 1: IDLE / RECENT SEARCHES & CURATED DISCOVERY */}
        {query.trim().length === 0 && (
          <div className="space-y-6 pt-2">
            {/* Recent Searches (Privacy-safe Client Storage) */}
            {isRecentLoaded && recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Recent Searches</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearSearches}
                    className="text-[10px] text-muted-foreground hover:text-red-600 transition-colors uppercase font-mono"
                  >
                    Clear History
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, i) => (
                    <div
                      key={i}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 text-xs text-neutral-800 transition-colors dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <button
                        type="button"
                        onClick={() => navigateToSearch(term)}
                        className="hover:underline"
                      >
                        {term}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSearch(term);
                        }}
                        className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-0.5 rounded-full"
                        aria-label={`Remove ${term} from recent searches`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curated Discovery Silhouettes */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Curated Silhouettes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Cashmere Coat",
                  "Silk Evening Gown",
                  "Tuxedo Blazer",
                  "Linen Oversized Shirt",
                  "Tailored Trouser",
                  "Poplin Shirt",
                ].map((term, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => navigateToSearch(term)}
                    className="rounded-full border border-border hover:border-neutral-900 px-3.5 py-1.5 text-xs text-neutral-700 hover:text-neutral-900 transition-colors dark:text-neutral-300 dark:hover:text-white"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Departments */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-2">
                Explore Departments
              </span>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/shop?gender=WOMEN"
                  onClick={handleClose}
                  className="text-xs text-foreground hover:underline underline-offset-4"
                >
                  Women&apos;s Atelier
                </Link>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <Link
                  href="/shop?gender=MEN"
                  onClick={handleClose}
                  className="text-xs text-foreground hover:underline underline-offset-4"
                >
                  Men&apos;s Tailoring
                </Link>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <Link
                  href="/shop"
                  onClick={handleClose}
                  className="text-xs text-foreground hover:underline underline-offset-4"
                >
                  All Silhouettes
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* State 2: TYPING & RESULTS / AUTOCOMPLETE MATCHES */}
        {query.trim().length > 0 && (
          <div className="space-y-4 pt-1" id="search-suggestions-list" role="listbox">
            {/* Category / Collection Fast Filters */}
            {(categorySuggestions.length > 0 || collectionSuggestions.length > 0) && (
              <div className="flex flex-wrap gap-2 pb-2 border-b border-border/60">
                {categorySuggestions.map((cat) => (
                  <Link
                    key={cat.id}
                    href={cat.href}
                    onClick={() => {
                      addSearch(query);
                      handleClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 px-3 py-1 text-xs text-neutral-800 transition-colors dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <Folder className="h-3 w-3 text-muted-foreground" />
                    <span>In {cat.name}</span>
                  </Link>
                ))}
                {collectionSuggestions.map((col) => (
                  <Link
                    key={col.id}
                    href={col.href}
                    onClick={() => {
                      addSearch(query);
                      handleClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border hover:border-neutral-900 px-3 py-1 text-xs text-neutral-800 transition-colors dark:text-neutral-200"
                  >
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <span>{col.name} Edit</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Product Suggestions List */}
            {productSuggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Matching Garments ({productSuggestions.length})</span>
                  <Link
                    href={`${ROUTES.SEARCH}?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => {
                      addSearch(query);
                      handleClose();
                    }}
                    className="inline-flex items-center text-primary hover:underline lowercase tracking-normal text-xs font-normal"
                  >
                    View all results <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>

                <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
                  {productSuggestions.map((item, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          addSearch(query);
                          handleClose();
                        }}
                        className={`flex items-center gap-4 py-2.5 px-2.5 rounded transition-colors ${
                          isSelected
                            ? "bg-neutral-100 dark:bg-neutral-800"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="relative h-12 w-10 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.label}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                              VER
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.subtitle && (
                            <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          )}
                          <h5 className="text-xs font-medium text-foreground truncate">
                            {item.label}
                          </h5>
                          {typeof item.price === "number" && (
                            <p className="text-xs font-semibold text-neutral-900 dark:text-white mt-0.5">
                              ₹{item.price.toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-400 opacity-60" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* State 3: NO RESULTS */}
            {!isLoading && allSuggestions.length === 0 && (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm font-medium text-foreground">
                  No garments found matching &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try checking for typos, searching for broader terms (e.g. linen, blazer, dress), or explore curated collections.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href={`${ROUTES.SEARCH}?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => {
                      addSearch(query);
                      handleClose();
                    }}
                    className="inline-block text-xs uppercase font-mono tracking-widest text-primary underline underline-offset-4"
                  >
                    Search Full Catalog &rarr;
                  </Link>
                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                  <Link
                    href={ROUTES.SHOP}
                    onClick={handleClose}
                    className="inline-block text-xs uppercase font-mono tracking-widest text-muted-foreground hover:text-foreground"
                  >
                    Browse All &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
