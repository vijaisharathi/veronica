import { describe, it, expect, vi, beforeEach } from "vitest";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { wishlistRepository } from "@/db/repositories/wishlist.repository";
import { productService } from "@/modules/catalog/product.service";
import { ProductModel } from "@/db/models";
import { ProductPreview } from "@/types/storefront";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/repositories/wishlist.repository", () => ({
  wishlistRepository: {
    getWishlistItems: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    isInWishlist: vi.fn(),
    getWishlistStatusForProducts: vi.fn(),
    getWishlistCount: vi.fn(),
    clearWishlist: vi.fn(),
  },
}));

vi.mock("@/modules/catalog/product.service", () => ({
  productService: {
    getProductPreviewsByIds: vi.fn(),
  },
}));

vi.mock("@/db/models", () => ({
  ProductModel: {
    findOne: vi.fn(),
  },
}));

const mockPreview: ProductPreview = {
  id: "prod-1",
  slug: "classic-linen-shirt",
  brand: "VÉRONA ATELIER",
  title: "Classic Linen Shirt",
  currentPrice: 4500,
  mrp: 5000,
  discountPercent: 10,
  rating: 4.8,
  ratingCount: 24,
  primaryImage: "/images/linen-1.jpg",
  category: "Shirts",
  gender: "men",
  sizes: ["S", "M", "L"],
  colors: [{ name: "Sage", hex: "#8A9A5B" }],
  inStock: true,
};

describe("Phase 13 — Wishlist Domain Service Unit Tests", () => {
  const customerId = "cust-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWishlist", () => {
    it("should return empty list when customer has no wishlisted items", async () => {
      vi.mocked(wishlistRepository.getWishlistItems).mockResolvedValue([]);

      const result = await wishlistService.getWishlist(customerId);
      expect(result.items).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("should hydrate wishlist items with product details and omit unpublished products", async () => {
      const addedDate = new Date("2026-09-25T10:00:00Z");
      vi.mocked(wishlistRepository.getWishlistItems).mockResolvedValue([
        {
          _id: "item-1",
          wishlistId: "wish-1",
          customerId,
          productId: "prod-1",
          variantId: undefined,
          addedAt: addedDate,
          createdAt: addedDate,
          updatedAt: addedDate,
        },
        {
          _id: "item-2",
          wishlistId: "wish-1",
          customerId,
          productId: "prod-unpublished",
          variantId: undefined,
          addedAt: addedDate,
          createdAt: addedDate,
          updatedAt: addedDate,
        },
      ] as any);

      // productService only returns the published product
      vi.mocked(productService.getProductPreviewsByIds).mockResolvedValue([mockPreview]);

      const result = await wishlistService.getWishlist(customerId);

      expect(result.count).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: "item-1",
        wishlistId: "wish-1",
        customerId,
        productId: "prod-1",
        variantId: null,
        addedAt: addedDate.toISOString(),
        product: mockPreview,
      });
    });
  });

  describe("addToWishlist", () => {
    it("should reject non-existent or unpublished product with NotFoundError", async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(
        wishlistService.addToWishlist(customerId, "prod-nonexistent")
      ).rejects.toThrow(NotFoundError);
    });

    it("should idempotently add product and return populated WishlistItemDto", async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "prod-1", name: "Classic Linen Shirt" }),
      } as any);

      const addedDate = new Date();
      vi.mocked(wishlistRepository.addItem).mockResolvedValue({
        _id: "item-new",
        wishlistId: "wish-1",
        customerId,
        productId: "prod-1",
        variantId: undefined,
        addedAt: addedDate,
        createdAt: addedDate,
        updatedAt: addedDate,
      } as any);

      vi.mocked(productService.getProductPreviewsByIds).mockResolvedValue([mockPreview]);

      const item = await wishlistService.addToWishlist(customerId, "prod-1");

      expect(item.id).toBe("item-new");
      expect(item.productId).toBe("prod-1");
      expect(item.product.title).toBe("Classic Linen Shirt");
      expect(wishlistRepository.addItem).toHaveBeenCalledWith(customerId, "prod-1", undefined);
    });
  });

  describe("removeFromWishlist", () => {
    it("should call repository and return true when product successfully removed", async () => {
      vi.mocked(wishlistRepository.removeItem).mockResolvedValue(true);

      const removed = await wishlistService.removeFromWishlist(customerId, "prod-1");
      expect(removed).toBe(true);
      expect(wishlistRepository.removeItem).toHaveBeenCalledWith(customerId, "prod-1", undefined);
    });

    it("should return false safely when product was not in wishlist", async () => {
      vi.mocked(wishlistRepository.removeItem).mockResolvedValue(false);

      const removed = await wishlistService.removeFromWishlist(customerId, "prod-not-in-list");
      expect(removed).toBe(false);
    });
  });

  describe("getWishlistStatusForProducts", () => {
    it("should return empty status map if productIds is empty", async () => {
      const statusMap = await wishlistService.getWishlistStatusForProducts(customerId, []);
      expect(statusMap).toEqual({});
    });

    it("should batch lookup wishlist statuses without N+1 queries", async () => {
      vi.mocked(wishlistRepository.getWishlistStatusForProducts).mockResolvedValue({
        "prod-1": true,
        "prod-2": false,
      });

      const statusMap = await wishlistService.getWishlistStatusForProducts(customerId, [
        "prod-1",
        "prod-2",
      ]);

      expect(statusMap).toEqual({
        "prod-1": true,
        "prod-2": false,
      });
      expect(wishlistRepository.getWishlistStatusForProducts).toHaveBeenCalledWith(customerId, [
        "prod-1",
        "prod-2",
      ]);
    });
  });

  describe("clearWishlist", () => {
    it("should clear customer wishlist and return count of deleted items", async () => {
      vi.mocked(wishlistRepository.clearWishlist).mockResolvedValue(5);

      const count = await wishlistService.clearWishlist(customerId);
      expect(count).toBe(5);
      expect(wishlistRepository.clearWishlist).toHaveBeenCalledWith(customerId);
    });
  });
});
