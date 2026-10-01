/**
 * VÉRONA — Phase 08 Collection Service Unit Tests
 *
 * Tests for the CollectionService domain logic layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionService } from "@/modules/catalog/collection.service";

// Mock dependencies
vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

const mockFindBySlug = vi.fn();
const mockFindActiveCollections = vi.fn();
const mockFindFeaturedCollections = vi.fn();
const mockFindByCategoryId = vi.fn();

vi.mock("@/db/repositories/collection.repository", () => ({
  collectionRepository: {
    findBySlug: (...args: unknown[]) => mockFindBySlug(...args),
    findActiveCollections: (...args: unknown[]) => mockFindActiveCollections(...args),
    findFeaturedCollections: (...args: unknown[]) => mockFindFeaturedCollections(...args),
    findByCategoryId: (...args: unknown[]) => mockFindByCategoryId(...args),
  },
}));

const mockGetCategoryById = vi.fn();

vi.mock("@/modules/catalog/category.service", () => ({
  categoryService: {
    getCategoryById: (...args: unknown[]) => mockGetCategoryById(...args),
  },
  CategoryService: class {},
}));

const makeMockCollection = (overrides = {}) => ({
  _id: "col-123",
  name: "The Noir Collection",
  slug: "the-noir-collection",
  description: "Monochromatic precision.",
  heroImage: "https://example.com/noir.jpg",
  banner: "https://example.com/noir-banner.jpg",
  active: true,
  startDate: null,
  endDate: null,
  sortOrder: 1,
  seo: { title: "Noir | VÉRONA" },
  categoryIds: ["cat-1", "cat-2"],
  productIds: ["prod-1", "prod-2"],
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

describe("CollectionService", () => {
  let service: CollectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CollectionService();
  });

  describe("getCollectionBySlug", () => {
    it("should return collection detail with related categories", async () => {
      const mockCol = makeMockCollection();
      const mockCat1 = { id: "cat-1", name: "Women", slug: "women" };
      const mockCat2 = { id: "cat-2", name: "Men", slug: "men" };

      mockFindBySlug.mockResolvedValue(mockCol);
      mockGetCategoryById.mockResolvedValueOnce(mockCat1).mockResolvedValueOnce(mockCat2);

      const result = await service.getCollectionBySlug("the-noir-collection");

      expect(result.collection.name).toBe("The Noir Collection");
      expect(result.collection.id).toBe("col-123");
      expect(result.relatedCategories).toHaveLength(2);
      expect(result.breadcrumbs).toHaveLength(2);
      expect(result.breadcrumbs[0]!.label).toBe("Collections");
    });

    it("should throw NotFoundError for non-existent collection", async () => {
      mockFindBySlug.mockResolvedValue(null);

      await expect(service.getCollectionBySlug("non-existent")).rejects.toThrow();
    });

    it("should throw NotFoundError for inactive collection", async () => {
      mockFindBySlug.mockResolvedValue(makeMockCollection({ active: false }));

      await expect(service.getCollectionBySlug("inactive")).rejects.toThrow();
    });
  });

  describe("getActiveCollections", () => {
    it("should return mapped DTOs from repository data", async () => {
      const mockCollections = [
        makeMockCollection(),
        makeMockCollection({ _id: "col-2", name: "Summer Atelier", slug: "summer-atelier" }),
      ];
      mockFindActiveCollections.mockResolvedValue(mockCollections);

      const result = await service.getActiveCollections();

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe("col-123");
      expect(result[1]!.name).toBe("Summer Atelier");
    });

    it("should pass options to repository", async () => {
      mockFindActiveCollections.mockResolvedValue([]);

      await service.getActiveCollections({ onlyCurrentlyActive: true, limit: 3 });
      expect(mockFindActiveCollections).toHaveBeenCalledWith({
        onlyCurrentlyActive: true,
        limit: 3,
      });
    });
  });

  describe("getFeaturedCollections", () => {
    it("should return featured collections with default limit", async () => {
      mockFindFeaturedCollections.mockResolvedValue([makeMockCollection()]);

      const result = await service.getFeaturedCollections();
      expect(result).toHaveLength(1);
      expect(mockFindFeaturedCollections).toHaveBeenCalledWith(6);
    });

    it("should pass custom limit", async () => {
      mockFindFeaturedCollections.mockResolvedValue([]);

      await service.getFeaturedCollections(3);
      expect(mockFindFeaturedCollections).toHaveBeenCalledWith(3);
    });
  });

  describe("getCollectionsForCategory", () => {
    it("should return collections for a given category", async () => {
      mockFindByCategoryId.mockResolvedValue([makeMockCollection()]);

      const result = await service.getCollectionsForCategory("cat-1");
      expect(result).toHaveLength(1);
      expect(mockFindByCategoryId).toHaveBeenCalledWith("cat-1");
    });
  });
});
