/**
 * VÉRONA — Phase 08 Category Repository Unit Tests
 *
 * Tests for the CategoryRepository data access layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryRepository } from "@/db/repositories/category.repository";

// Mock the CategoryModel using vi.hoisted
const { mockFindOne, mockFind, mockUpdateOne } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockFind: vi.fn(),
  mockUpdateOne: vi.fn(),
}));

vi.mock("@/db/models", () => ({
  CategoryModel: {
    findOne: (...args: unknown[]) => {
      const result = mockFindOne(...args);
      return { lean: () => result };
    },
    find: (...args: unknown[]) => {
      const chainable = {
        sort: () => chainable,
        lean: () => mockFind(...args),
      };
      return chainable;
    },
    updateOne: mockUpdateOne,
  },
}));

describe("CategoryRepository", () => {
  let repo: CategoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CategoryRepository();
  });

  describe("findBySlug", () => {
    it("should query with lowercase slug and isDeleted filter", async () => {
      const mockCategory = {
        _id: "cat-123",
        name: "Women",
        slug: "women",
        gender: "WOMEN",
        active: true,
        isDeleted: false,
      };
      mockFindOne.mockResolvedValue(mockCategory);

      const result = await repo.findBySlug("Women");
      expect(mockFindOne).toHaveBeenCalledWith({
        slug: "women",
        isDeleted: false,
      });
      expect(result).toEqual(mockCategory);
    });

    it("should return null for non-existent slug", async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await repo.findBySlug("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should query by ID with isDeleted filter", async () => {
      const mockCategory = { _id: "cat-123", name: "Women" };
      mockFindOne.mockResolvedValue(mockCategory);

      const result = await repo.findById("cat-123");
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: "cat-123",
        isDeleted: false,
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe("findRootCategories", () => {
    it("should find root categories with parentId null", async () => {
      const mockRoots = [
        { _id: "cat-1", name: "Women", parentId: null },
        { _id: "cat-2", name: "Men", parentId: null },
      ];
      mockFind.mockResolvedValue(mockRoots);

      const result = await repo.findRootCategories();
      expect(result).toEqual(mockRoots);
    });

    it("should filter by gender when provided", async () => {
      const mockRoots = [{ _id: "cat-1", name: "Women", gender: "WOMEN" }];
      mockFind.mockResolvedValue(mockRoots);

      const result = await repo.findRootCategories("WOMEN" as any);
      expect(result).toEqual(mockRoots);
    });
  });

  describe("findSubcategories", () => {
    it("should find active subcategories by parentId", async () => {
      const mockSubs = [
        { _id: "sub-1", name: "Dresses", parentId: "cat-1" },
        { _id: "sub-2", name: "Tops", parentId: "cat-1" },
      ];
      mockFind.mockResolvedValue(mockSubs);

      const result = await repo.findSubcategories("cat-1");
      expect(result).toEqual(mockSubs);
    });
  });

  describe("getCategoryTree", () => {
    it("should build a hierarchical tree from flat categories", async () => {
      const flatCategories = [
        { _id: { toString: () => "cat-1" }, name: "Women", parentId: null },
        {
          _id: { toString: () => "sub-1" },
          name: "Dresses",
          parentId: { toString: () => "cat-1" },
        },
        {
          _id: { toString: () => "sub-2" },
          name: "Tops",
          parentId: { toString: () => "cat-1" },
        },
      ];
      mockFind.mockResolvedValue(flatCategories);

      const tree = await repo.getCategoryTree();
      expect(tree).toHaveLength(1);
      const root = tree[0]!;
      expect(root.name).toBe("Women");
      expect(root.children).toHaveLength(2);
      expect(root.children![0]!.name).toBe("Dresses");
      expect(root.children![1]!.name).toBe("Tops");
    });
  });

  describe("softDelete", () => {
    it("should set isDeleted and deletedAt on the category", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await repo.softDelete("cat-123");
      expect(result).toBe(true);
    });

    it("should return false if no document was modified", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 0 });

      const result = await repo.softDelete("non-existent");
      expect(result).toBe(false);
    });
  });
});
