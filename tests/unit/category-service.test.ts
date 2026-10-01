/**
 * VÉRONA — Phase 08 Category Service Unit Tests
 *
 * Tests for the CategoryService domain logic layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService } from "@/modules/catalog/category.service";

// Mock dependencies
vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

const mockFindBySlug = vi.fn();
const mockFindById = vi.fn();
const mockFindRootCategories = vi.fn();
const mockFindSubcategories = vi.fn();
const mockGetCategoryTree = vi.fn();

vi.mock("@/db/repositories/category.repository", () => ({
  categoryRepository: {
    findBySlug: (...args: unknown[]) => mockFindBySlug(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findRootCategories: (...args: unknown[]) => mockFindRootCategories(...args),
    findSubcategories: (...args: unknown[]) => mockFindSubcategories(...args),
    getCategoryTree: (...args: unknown[]) => mockGetCategoryTree(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const makeMockCategory = (overrides = {}) => ({
  _id: "cat-123",
  name: "Women",
  slug: "women",
  description: "Women's department",
  image: "https://example.com/women.jpg",
  banner: "https://example.com/women-banner.jpg",
  gender: "WOMEN",
  sortOrder: 1,
  active: true,
  parentId: null,
  seo: { title: "Women | VÉRONA" },
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

describe("CategoryService", () => {
  let service: CategoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CategoryService();
  });

  describe("getCategoryBySlug", () => {
    it("should return category with subcategories and breadcrumbs", async () => {
      const mockCat = makeMockCategory();
      const mockSubcats = [
        makeMockCategory({ _id: "sub-1", name: "Dresses", slug: "women-dresses", parentId: "cat-123" }),
        makeMockCategory({ _id: "sub-2", name: "Tops", slug: "women-tops", parentId: "cat-123" }),
      ];

      mockFindBySlug.mockResolvedValue(mockCat);
      mockFindSubcategories.mockResolvedValue(mockSubcats);

      const result = await service.getCategoryBySlug("women");

      expect(result.category.name).toBe("Women");
      expect(result.category.id).toBe("cat-123");
      expect(result.subcategories).toHaveLength(2);
      expect(result.subcategories[0]!.name).toBe("Dresses");
      expect(result.breadcrumbs.length).toBeGreaterThan(0);
    });

    it("should throw NotFoundError for non-existent category", async () => {
      mockFindBySlug.mockResolvedValue(null);

      await expect(service.getCategoryBySlug("non-existent")).rejects.toThrow();
    });

    it("should throw NotFoundError for inactive category", async () => {
      mockFindBySlug.mockResolvedValue(makeMockCategory({ active: false }));

      await expect(service.getCategoryBySlug("women")).rejects.toThrow();
    });
  });

  describe("getRootCategories", () => {
    it("should return mapped DTOs from repository data", async () => {
      const mockRoots = [
        makeMockCategory({ _id: "cat-1", name: "Women", slug: "women" }),
        makeMockCategory({ _id: "cat-2", name: "Men", slug: "men", gender: "MEN" }),
      ];
      mockFindRootCategories.mockResolvedValue(mockRoots);

      const result = await service.getRootCategories();

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe("cat-1");
      expect(result[0]!.name).toBe("Women");
      expect(result[1]!.name).toBe("Men");
    });

    it("should filter by gender when provided", async () => {
      mockFindRootCategories.mockResolvedValue([makeMockCategory()]);

      await service.getRootCategories("WOMEN" as any);
      expect(mockFindRootCategories).toHaveBeenCalledWith("WOMEN");
    });
  });

  describe("getChildCategories", () => {
    it("should return child categories as DTOs", async () => {
      const mockChildren = [
        makeMockCategory({ _id: "sub-1", name: "Dresses" }),
        makeMockCategory({ _id: "sub-2", name: "Tops" }),
      ];
      mockFindSubcategories.mockResolvedValue(mockChildren);

      const result = await service.getChildCategories("cat-1");
      expect(result).toHaveLength(2);
    });
  });

  describe("getDepartmentCategories", () => {
    it("should return department and subcategories for valid gender slug", async () => {
      const mockDept = makeMockCategory();
      const mockSubs = [makeMockCategory({ _id: "sub-1", name: "Dresses", parentId: "cat-123" })];

      mockFindBySlug.mockResolvedValue(mockDept);
      mockFindSubcategories.mockResolvedValue(mockSubs);

      const result = await service.getDepartmentCategories("women");

      expect(result).not.toBeNull();
      expect(result!.department.name).toBe("Women");
      expect(result!.subcategories).toHaveLength(1);
    });

    it("should return null for invalid gender slug", async () => {
      const result = await service.getDepartmentCategories("invalid");
      expect(result).toBeNull();
    });

    it("should return null when department category not found", async () => {
      mockFindBySlug.mockResolvedValue(null);

      const result = await service.getDepartmentCategories("women");
      expect(result).toBeNull();
    });
  });

  describe("getCategoryTree", () => {
    it("should map tree nodes to DTOs", async () => {
      const mockTree = [
        {
          ...makeMockCategory({ _id: "cat-1" }),
          children: [
            {
              ...makeMockCategory({ _id: "sub-1", name: "Dresses" }),
              children: [],
            },
          ],
        },
      ];
      mockGetCategoryTree.mockResolvedValue(mockTree);

      const result = await service.getCategoryTree();
      expect(result).toHaveLength(1);
      expect(result[0]!.children).toHaveLength(1);
      expect(result[0]!.children[0]!.name).toBe("Dresses");
    });
  });
});
