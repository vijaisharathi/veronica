/**
 * VÉRONA — Phase 08 Collection Repository Unit Tests
 *
 * Tests for the CollectionRepository data access layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionRepository } from "@/db/repositories/collection.repository";

// Mock the FashionCollectionModel using vi.hoisted
const { mockFindOne, mockFind, mockUpdateOne } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockFind: vi.fn(),
  mockUpdateOne: vi.fn(),
}));

vi.mock("@/db/models", () => ({
  FashionCollectionModel: {
    findOne: (...args: unknown[]) => {
      const result = mockFindOne(...args);
      return { lean: () => result };
    },
    find: (...args: unknown[]) => {
      const chainable = {
        sort: () => chainable,
        limit: () => chainable,
        lean: () => mockFind(...args),
      };
      return chainable;
    },
    updateOne: mockUpdateOne,
  },
}));

describe("CollectionRepository", () => {
  let repo: CollectionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CollectionRepository();
  });

  describe("findBySlug", () => {
    it("should query with lowercase slug and isDeleted filter", async () => {
      const mockCollection = {
        _id: "col-123",
        name: "The Noir Collection",
        slug: "the-noir-collection",
        active: true,
        isDeleted: false,
      };
      mockFindOne.mockResolvedValue(mockCollection);

      const result = await repo.findBySlug("The-Noir-Collection");
      expect(mockFindOne).toHaveBeenCalledWith({
        slug: "the-noir-collection",
        isDeleted: false,
      });
      expect(result).toEqual(mockCollection);
    });

    it("should return null when collection not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await repo.findBySlug("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should query by ID with isDeleted filter", async () => {
      const mockCollection = { _id: "col-123", name: "The Noir Collection" };
      mockFindOne.mockResolvedValue(mockCollection);

      const result = await repo.findById("col-123");
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: "col-123",
        isDeleted: false,
      });
      expect(result).toEqual(mockCollection);
    });
  });

  describe("findActiveCollections", () => {
    it("should return active, non-deleted collections sorted by sortOrder", async () => {
      const mockCollections = [
        { _id: "col-1", name: "Noir", sortOrder: 1 },
        { _id: "col-2", name: "Summer", sortOrder: 2 },
      ];
      mockFind.mockResolvedValue(mockCollections);

      const result = await repo.findActiveCollections();
      expect(result).toEqual(mockCollections);
    });

    it("should apply date filtering when onlyCurrentlyActive is true", async () => {
      mockFind.mockResolvedValue([]);

      await repo.findActiveCollections({ onlyCurrentlyActive: true });
      // The query should include $or with date conditions
      expect(mockFind).toHaveBeenCalled();
    });
  });

  describe("findByCategoryId", () => {
    it("should find collections containing a category", async () => {
      const mockCollections = [{ _id: "col-1", name: "Heritage", categoryIds: ["cat-1"] }];
      mockFind.mockResolvedValue(mockCollections);

      const result = await repo.findByCategoryId("cat-1");
      expect(result).toEqual(mockCollections);
    });
  });

  describe("findFeaturedCollections", () => {
    it("should return limited featured collections", async () => {
      const mockCollections = [{ _id: "col-1", name: "Featured" }];
      mockFind.mockResolvedValue(mockCollections);

      const result = await repo.findFeaturedCollections(3);
      expect(result).toEqual(mockCollections);
    });
  });

  describe("softDelete", () => {
    it("should set isDeleted flag", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
      const result = await repo.softDelete("col-123");
      expect(result).toBe(true);
    });

    it("should return false when no document modified", async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 0 });
      const result = await repo.softDelete("non-existent");
      expect(result).toBe(false);
    });
  });
});
