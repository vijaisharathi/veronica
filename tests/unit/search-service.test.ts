import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchService } from "@/modules/search/search.service";
import { SearchProvider, SearchProviderResult } from "@/modules/search/search.types";
import { ProductStatus, ProductVisibility, VariantStatus, Gender } from "@/constants/status";
import { logger } from "@/lib/logger";

describe("Search Service (Phase 10)", () => {
  let searchService: SearchService;
  let mockProvider: SearchProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, "info").mockImplementation(() => {});

    mockProvider = {
      search: vi.fn(),
      suggest: vi.fn(),
    };

    searchService = new SearchService(mockProvider);
  });

  describe("searchProducts", () => {
    it("normalizes query, executes search via provider, and transforms products into safe DTOs", async () => {
      const mockResult: SearchProviderResult = {
        products: [
          {
            _id: "prod-1" as any,
            name: "Linen Shirt",
            slug: "linen-shirt",
            description: "Fine Italian linen.",
            brandId: "brand-1" as any,
            categoryIds: ["cat-1" as any],
            collectionIds: ["col-1" as any],
            gender: Gender.MEN,
            productType: "Shirt",
            status: ProductStatus.PUBLISHED,
            visibility: ProductVisibility.PUBLIC,
            featured: false,
            bestseller: true,
            newArrival: false,
            tags: ["linen", "summer"],
            images: [{ url: "/images/shirt.jpg", isPrimary: true, sortOrder: 0 }],
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ],
        variantsMap: new Map([
          [
            "prod-1",
            [
              {
                _id: "var-1" as any,
                productId: "prod-1" as any,
                sku: "VER-LNN-001",
                size: "M",
                color: { name: "White", slug: "white", hexCode: "#FFFFFF" },
                mrp: 600000,
                sellingPrice: 450000,
                status: VariantStatus.ACTIVE,
                active: true,
                isDeleted: false,
              } as any,
            ],
          ],
        ]),
        brandMap: new Map([
          [
            "brand-1",
            {
              _id: "brand-1" as any,
              name: "VÉRONA Atelier",
              slug: "verona-atelier",
            } as any,
          ],
        ]),
        categoryMap: new Map([
          [
            "cat-1",
            {
              _id: "cat-1" as any,
              name: "Shirts",
              slug: "shirts",
              gender: Gender.MEN,
            } as any,
          ],
        ]),
        collectionMap: new Map([
          [
            "col-1",
            {
              _id: "col-1" as any,
              name: "Summer Edit",
              slug: "summer-edit",
            } as any,
          ],
        ]),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        facets: {
          categories: [{ id: "cat-1", name: "Shirts", slug: "shirts", count: 1 }],
          brands: [{ id: "brand-1", name: "VÉRONA Atelier", slug: "verona-atelier", count: 1 }],
          collections: [{ id: "col-1", name: "Summer Edit", slug: "summer-edit", count: 1 }],
          genders: [{ label: "Men", value: "MEN", count: 1 }],
          colors: [{ name: "White", slug: "white", hexCode: "#FFFFFF", count: 1 }],
          sizes: [{ label: "M", count: 1 }],
          fabrics: [],
          fits: [],
          priceRange: { min: 4500, max: 4500 },
        },
      };

      vi.mocked(mockProvider.search).mockResolvedValue(mockResult);

      const response = await searchService.searchProducts({
        query: "  LINEN   SHIRT  ",
        category: "shirts",
      });

      expect(mockProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: "  LINEN   SHIRT  ", category: "shirts" }),
        expect.objectContaining({ normalized: "linen shirt", tokens: ["linen", "shirt"] })
      );

      expect(response.total).toBe(1);
      expect(response.normalizedQuery).toBe("linen shirt");
      expect(response.items.length).toBe(1);
      expect(response.items[0]?.title).toBe("Linen Shirt");
      expect(response.items[0]?.brand).toBe("VÉRONA Atelier");
      expect(response.items[0]?.currentPrice).toBe(4500); // 450000 paise converted to Rs. 4500
      expect(response.facets.categories[0]?.name).toBe("Shirts");

      // Verify search telemetry was invoked
      expect(logger.info).toHaveBeenCalledWith(
        "Search analytics event",
        expect.objectContaining({
          eventType: "search_submitted",
          normalizedQuery: "linen shirt",
          resultCount: 1,
        }),
        "SearchAnalytics"
      );
    });

    it("records 'search_no_results' telemetry when total is 0", async () => {
      vi.mocked(mockProvider.search).mockResolvedValue({
        products: [],
        variantsMap: new Map(),
        brandMap: new Map(),
        categoryMap: new Map(),
        collectionMap: new Map(),
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        facets: {
          categories: [],
          brands: [],
          collections: [],
          genders: [],
          colors: [],
          sizes: [],
          fabrics: [],
          fits: [],
          priceRange: { min: 0, max: 0 },
        },
        didYouMean: "t-shirt",
      });

      const response = await searchService.searchProducts({ query: "tshrt" });

      expect(response.total).toBe(0);
      expect(response.didYouMean).toBe("t-shirt");

      expect(logger.info).toHaveBeenCalledWith(
        "Search analytics event",
        expect.objectContaining({
          eventType: "search_no_results",
          resultCount: 0,
        }),
        "SearchAnalytics"
      );
    });
  });

  describe("getSuggestions", () => {
    it("delegates autocomplete requests to the search provider with normalized query", async () => {
      vi.mocked(mockProvider.suggest).mockResolvedValue({
        query: "lin",
        suggestions: [
          {
            id: "prod-1",
            type: "product",
            label: "Linen Shirt",
            href: "/product/linen-shirt",
          },
        ],
        categories: [],
        collections: [],
        brands: [],
        curatedTerms: ["Cashmere", "Blazer"],
      });

      const result = await searchService.getSuggestions("lin", 5);

      expect(mockProvider.suggest).toHaveBeenCalledWith(
        "lin",
        expect.objectContaining({ normalized: "lin" }),
        5
      );
      expect(result.suggestions[0]?.label).toBe("Linen Shirt");
    });
  });
});
