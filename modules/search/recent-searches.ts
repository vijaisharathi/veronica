/**
 * VÉRONA — Recent Searches Privacy-Safe Client Storage
 *
 * Persists recent searches locally in the browser's localStorage.
 * Ensures strict privacy: queries are never leaked across users, sessions, or public telemetry.
 * Automatically deduplicates, normalizes, and caps at MAX_RECENT_SEARCHES items.
 */

import { useState, useEffect, useCallback } from "react";
import { normalizeSearchQuery } from "./search.normalizer";

const RECENT_SEARCHES_STORAGE_KEY = "verona_recent_searches_v1";
const MAX_RECENT_SEARCHES = 8;

export function getStoredRecentSearches(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    // Graceful fallback if storage is restricted or corrupted
  }

  return [];
}

export function saveStoredRecentSearches(searches: string[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Ignore storage quota exceeded or disabled storage
  }
}

export function appendRecentSearch(query: string): string[] {
  const normalized = normalizeSearchQuery(query).normalized;
  if (!normalized || normalized.length < 2) {
    return getStoredRecentSearches();
  }

  const current = getStoredRecentSearches();
  // Remove duplicate if it already exists, then prepend to the top
  const filtered = current.filter((item) => item.toLowerCase() !== normalized.toLowerCase());
  const updated = [normalized, ...filtered].slice(0, MAX_RECENT_SEARCHES);

  saveStoredRecentSearches(updated);
  return updated;
}

export function deleteRecentSearch(query: string): string[] {
  const current = getStoredRecentSearches();
  const updated = current.filter((item) => item.toLowerCase() !== query.toLowerCase());
  saveStoredRecentSearches(updated);
  return updated;
}

export function clearAllRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * React hook to synchronize recent searches state across components
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setRecentSearches(getStoredRecentSearches());
    setIsLoaded(true);
  }, []);

  const addSearch = useCallback((term: string) => {
    const updated = appendRecentSearch(term);
    setRecentSearches(updated);
  }, []);

  const removeSearch = useCallback((term: string) => {
    const updated = deleteRecentSearch(term);
    setRecentSearches(updated);
  }, []);

  const clearSearches = useCallback(() => {
    clearAllRecentSearches();
    setRecentSearches([]);
  }, []);

  return {
    recentSearches,
    isLoaded,
    addSearch,
    removeSearch,
    clearSearches,
  };
}
