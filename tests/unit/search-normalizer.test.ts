import { describe, it, expect } from "vitest";
import {
  normalizeSearchQuery,
  expandSynonyms,
  getDidYouMeanSuggestion,
  isExactSkuPattern,
} from "@/modules/search/search.normalizer";

describe("Search Normalizer (Phase 10)", () => {
  describe("normalizeSearchQuery", () => {
    it("handles leading and trailing whitespace and multiple internal spaces", () => {
      const result = normalizeSearchQuery("   black    oversized   t-shirt   ");
      expect(result.normalized).toBe("black oversized t-shirt");
      expect(result.tokens).toEqual(["black", "oversized", "t-shirt"]);
    });

    it("converts uppercase to lowercase", () => {
      const result = normalizeSearchQuery("LINEN BLAZER");
      expect(result.normalized).toBe("linen blazer");
      expect(result.tokens).toEqual(["linen", "blazer"]);
    });

    it("applies safe Unicode NFKC normalization", () => {
      // Full-width latin characters
      const result = normalizeSearchQuery("ｓｈｉｒｔ");
      expect(result.normalized).toBe("shirt");
    });

    it("sanitizes HTML tags and dangerous characters", () => {
      const result = normalizeSearchQuery("<script>alert(1)</script> coat");
      expect(result.normalized).toBe("alert(1) coat");
      expect(result.tokens).toContain("coat");
    });

    it("enforces a maximum query length of 100 characters", () => {
      const longInput = "a".repeat(150);
      const result = normalizeSearchQuery(longInput);
      expect(result.normalized.length).toBeLessThanOrEqual(100);
    });

    it("handles empty or whitespace-only queries cleanly", () => {
      const result = normalizeSearchQuery("     ");
      expect(result.normalized).toBe("");
      expect(result.tokens).toEqual([]);
      expect(result.expandedTerms).toEqual([]);
    });

    it("identifies exact SKU patterns", () => {
      const result = normalizeSearchQuery("VER-LNN-001");
      expect(result.isExactSkuMatch).toBe(true);
      expect(result.tokens).toContain("ver-lnn-001");
    });
  });

  describe("expandSynonyms", () => {
    it("expands controlled fashion synonyms", () => {
      const expanded = expandSynonyms(["tee", "denim"]);
      expect(expanded).toContain("t-shirt");
      expect(expanded).toContain("jeans");
    });

    it("does not alter tokens without synonym mappings", () => {
      const expanded = expandSynonyms(["cashmere"]);
      expect(expanded).toEqual(["cashmere"]);
    });
  });

  describe("isExactSkuPattern", () => {
    it("recognizes VÉRONA SKU formats", () => {
      expect(isExactSkuPattern("VER-TSH-001")).toBe(true);
      expect(isExactSkuPattern("ver-csh-042-blk")).toBe(true);
      expect(isExactSkuPattern("regular shirt")).toBe(false);
    });
  });

  describe("getDidYouMeanSuggestion", () => {
    it("suggests 'oversized' for 'oversizd'", () => {
      const suggestion = getDidYouMeanSuggestion("oversizd");
      expect(suggestion).toBe("oversized");
    });

    it("suggests 'cashmere' for 'cashemere'", () => {
      const suggestion = getDidYouMeanSuggestion("cashemere");
      expect(suggestion).toBe("cashmere");
    });

    it("returns null for completely unrelated or very far strings", () => {
      const suggestion = getDidYouMeanSuggestion("xyzabcdefghijk");
      expect(suggestion).toBeNull();
    });

    it("returns null if the word is already a known target vocabulary word", () => {
      const suggestion = getDidYouMeanSuggestion("blazer");
      expect(suggestion).toBeNull();
    });
  });
});
