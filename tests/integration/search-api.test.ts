/**
 * VÉRONA — Phase 10 Search API Integration Tests
 *
 * Tests for GET /api/search and GET /api/search/suggestions endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as searchRoute } from "@/app/api/search/route";
import { GET as suggestionsRoute } from "@/app/api/search/suggestions/route";
import { searchService } from "@/modules/search/search.service";

vi.mock("@/modules/search/search.service", () => ({
  searchService: {
    searchProducts: vi.fn(),
    getSuggestions: vi.fn(),
  },
}));

describe("Search API Routes (Phase 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/search", () => {
    it("returns 200 with search results and facet counts", async () => {
      vi.mocked(searchService.searchProducts).mockResolvedValue({
        items: [
          {
            id: "prod-1",
            slug: "linen-blazer",
            brand: "VÉRONA Atelier",
            title: "Linen Blazer",
            currentPrice: 12000,
            mrp: 14000,
            discountPercent: 14,
            rating: 0,
            ratingCount: 0,
            primaryImage: "/images/blazer.jpg",
            category: "Blazers",
            gender: "men",
            sizes: ["40", "42"],
            colors: [{ name: "Navy", hex: "#000080" }],
            isNew: true,
            isSale: true,
            inStock: true,
          },
        ],
        dtos: [] as any,
        query: "blazer",
        normalizedQuery: "blazer",
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        facets: {
          categories: [{ id: "cat-1", name: "Blazers", slug: "blazers", count: 1 }],
          brands: [{ id: "brand-1", name: "VÉRONA Atelier", slug: "verona-atelier", count: 1 }],
          collections: [],
          genders: [{ label: "Men", value: "MEN", count: 1 }],
          colors: [{ name: "Navy", slug: "navy", hexCode: "#000080", count: 1 }],
          sizes: [{ label: "40", count: 1 }],
          fabrics: [{ label: "Linen", count: 1 }],
          fits: [],
          priceRange: { min: 12000, max: 12000 },
        },
        activeFilters: {},
        sort: "relevance",
      });

      const request = new NextRequest("http://localhost:3000/api/search?q=blazer&gender=MEN&minPrice=5000&maxPrice=15000");
      const response = await searchRoute(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.total).toBe(1);
      expect(json.data.items[0].title).toBe("Linen Blazer");
      expect(searchService.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "blazer",
          gender: "MEN",
          minPrice: 5000,
          maxPrice: 15000,
        })
      );
    });

    it("returns 400 when minPrice > maxPrice", async () => {
      const request = new NextRequest("http://localhost:3000/api/search?q=shirt&minPrice=10000&maxPrice=2000");
      const response = await searchRoute(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(searchService.searchProducts).not.toHaveBeenCalled();
    });

    it("returns 400 when query exceeds maximum length of 100 characters", async () => {
      const longQuery = "a".repeat(105);
      const request = new NextRequest(`http://localhost:3000/api/search?q=${longQuery}`);
      const response = await searchRoute(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when limit exceeds allowed ceiling of 50", async () => {
      const request = new NextRequest("http://localhost:3000/api/search?q=tuxedo&limit=100");
      const response = await searchRoute(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/search/suggestions", () => {
    it("returns 200 with suggestions payload for valid query prefix", async () => {
      vi.mocked(searchService.getSuggestions).mockResolvedValue({
        query: "cash",
        suggestions: [
          {
            id: "prod-2",
            type: "product",
            label: "Cashmere Overcoat",
            href: "/product/cashmere-overcoat",
          },
        ],
        categories: [],
        collections: [],
        brands: [],
        curatedTerms: ["Cashmere Overcoat", "Cashmere Scarf"],
      });

      const request = new NextRequest("http://localhost:3000/api/search/suggestions?q=cash&limit=5");
      const response = await suggestionsRoute(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.suggestions[0].label).toBe("Cashmere Overcoat");
      expect(searchService.getSuggestions).toHaveBeenCalledWith("cash", 5);
    });

    it("returns 400 when query parameter q is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/search/suggestions");
      const response = await suggestionsRoute(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
