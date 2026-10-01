import { describe, it, expect } from "vitest";
import {
  SearchQuerySchema,
  SearchSuggestionQuerySchema,
} from "@/modules/search/search.validation";

describe("Search Validation Schemas (Phase 10)", () => {
  describe("SearchQuerySchema", () => {
    it("parses valid search parameters with sensible defaults", () => {
      const parsed = SearchQuerySchema.parse({
        q: "linen shirt",
      });

      expect(parsed.q).toBe("linen shirt");
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
      expect(parsed.sort).toBe("relevance");
    });

    it("accepts valid filter parameters", () => {
      const parsed = SearchQuerySchema.parse({
        q: "blazer",
        gender: "WOMEN",
        category: "outerwear",
        brand: "verona-atelier",
        color: "noir",
        size: "M",
        minPrice: "1000",
        maxPrice: "5000",
        inStock: "true",
        sort: "price_asc",
        page: "2",
        limit: "15",
      });

      expect(parsed.gender).toBe("WOMEN");
      expect(parsed.category).toBe("outerwear");
      expect(parsed.minPrice).toBe(1000);
      expect(parsed.maxPrice).toBe(5000);
      expect(parsed.inStock).toBe(true);
      expect(parsed.sort).toBe("price_asc");
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(15);
    });

    it("rejects when minPrice exceeds maxPrice", () => {
      const result = SearchQuerySchema.safeParse({
        minPrice: 5000,
        maxPrice: 2000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Minimum price cannot exceed maximum price");
      }
    });

    it("clamps limit parameter to maximum of 50", () => {
      const result = SearchQuerySchema.safeParse({
        limit: 1000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Limit cannot exceed 50");
      }
    });

    it("rejects negative page numbers", () => {
      const result = SearchQuerySchema.safeParse({
        page: -5,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Page must be at least 1");
      }
    });

    it("rejects queries exceeding 100 characters", () => {
      const result = SearchQuerySchema.safeParse({
        q: "x".repeat(101),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Query cannot exceed 100 characters");
      }
    });
  });

  describe("SearchSuggestionQuerySchema", () => {
    it("validates valid suggestion query", () => {
      const parsed = SearchSuggestionQuerySchema.parse({
        q: "lin",
        limit: "5",
      });

      expect(parsed.q).toBe("lin");
      expect(parsed.limit).toBe(5);
    });

    it("rejects empty query string for suggestions", () => {
      const result = SearchSuggestionQuerySchema.safeParse({
        q: "",
      });

      expect(result.success).toBe(false);
    });

    it("clamps suggestion limit to max 20", () => {
      const result = SearchSuggestionQuerySchema.safeParse({
        q: "blazer",
        limit: 50,
      });

      expect(result.success).toBe(false);
    });
  });
});
