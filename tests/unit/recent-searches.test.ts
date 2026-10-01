import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredRecentSearches,
  appendRecentSearch,
  deleteRecentSearch,
  clearAllRecentSearches,
} from "@/modules/search/recent-searches";

describe("Recent Searches Client Storage (Phase 10)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns empty array when no searches stored", () => {
    expect(getStoredRecentSearches()).toEqual([]);
  });

  it("appends and normalizes a search query", () => {
    const updated = appendRecentSearch("  Cashmere   Coat  ");
    expect(updated).toEqual(["cashmere coat"]);
    expect(getStoredRecentSearches()).toEqual(["cashmere coat"]);
  });

  it("deduplicates case-insensitive queries and moves latest to the top", () => {
    appendRecentSearch("linen shirt");
    appendRecentSearch("silk gown");
    const updated = appendRecentSearch("LINEN SHIRT");

    expect(updated).toEqual(["linen shirt", "silk gown"]);
  });

  it("caps stored history at 8 items", () => {
    for (let i = 1; i <= 10; i++) {
      appendRecentSearch(`query ${i}`);
    }

    const stored = getStoredRecentSearches();
    expect(stored.length).toBe(8);
    expect(stored[0]).toBe("query 10");
  });

  it("ignores single-character or blank queries", () => {
    appendRecentSearch("a");
    appendRecentSearch("   ");
    expect(getStoredRecentSearches()).toEqual([]);
  });

  it("deletes a specific search query", () => {
    appendRecentSearch("tuxedo");
    appendRecentSearch("blazer");

    const updated = deleteRecentSearch("tuxedo");
    expect(updated).toEqual(["blazer"]);
    expect(getStoredRecentSearches()).toEqual(["blazer"]);
  });

  it("clears all recent searches", () => {
    appendRecentSearch("tuxedo");
    appendRecentSearch("blazer");
    clearAllRecentSearches();

    expect(getStoredRecentSearches()).toEqual([]);
  });
});
