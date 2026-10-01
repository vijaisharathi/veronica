import { describe, it, expect, vi, beforeEach } from "vitest";
import { recentlyViewedService } from "@/modules/wishlist/recently-viewed.service";
import { recentlyViewedRepository } from "@/db/repositories/recently-viewed.repository";
import { productService } from "@/modules/catalog/product.service";
import { ProductModel } from "@/db/models";
import { ProductPreview } from "@/types/storefront";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/repositories/recently-viewed.repository", () => ({
  recentlyViewedRepository: {
    recordView: vi.fn(),
    getRecentlyViewed: vi.fn(),
    clearRecentlyViewed: vi.fn(),
    removeItem: vi.fn(),
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

const mockPreviewA: ProductPreview = {
  id: "prod-A",
  slug: "linen-blazer",
  brand: "VÉRONA",
  title: "Tailored Linen Blazer",
  currentPrice: 18000,
  mrp: 20000,
  discountPercent: 10,
  rating: 4.9,
  ratingCount: 18,
  primaryImage: "/images/blazer.jpg",
  category: "Blazers",
  gender: "men",
  sizes: ["38", "40", "42"],
  colors: [{ name: "Ivory", hex: "#FFFFF0" }],
  inStock: true,
};

const mockPreviewB: ProductPreview = {
  id: "prod-B",
  slug: "silk-saree",
  brand: "VÉRONA",
  title: "Varanasi Silk Saree",
  currentPrice: 24000,
  mrp: 24000,
  discountPercent: 0,
  rating: 5.0,
  ratingCount: 32,
  primaryImage: "/images/saree.jpg",
  category: "Sarees",
  gender: "women",
  sizes: ["One Size"],
  colors: [{ name: "Emerald", hex: "#50C878" }],
  inStock: true,
};

describe("Phase 13 — Recently Viewed Domain Service Unit Tests", () => {
  const customerIdentity = { customerId: "cust-123" };
  const guestIdentity = { sessionId: "sess-abc-xyz" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordView", () => {
    it("should silently ignore recording for a nonexistent or draft product", async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const recorded = await recentlyViewedService.recordView(
        customerIdentity,
        "prod-draft-or-404"
      );
      expect(recorded).toBe(false);
      expect(recentlyViewedRepository.recordView).not.toHaveBeenCalled();
    });

    it("should record view for authenticated customer on valid published product", async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "prod-A", name: "Tailored Linen Blazer" }),
      } as any);

      vi.mocked(recentlyViewedRepository.recordView).mockResolvedValue({
        _id: "rec-1",
        customerId: "cust-123",
        productId: "prod-A",
        viewedAt: new Date(),
      } as any);

      const recorded = await recentlyViewedService.recordView(customerIdentity, "prod-A");
      expect(recorded).toBe(true);
      expect(recentlyViewedRepository.recordView).toHaveBeenCalledWith(
        customerIdentity,
        "prod-A"
      );
    });

    it("should record view for anonymous guest session on valid published product", async () => {
      vi.mocked(ProductModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "prod-B", name: "Varanasi Silk Saree" }),
      } as any);

      vi.mocked(recentlyViewedRepository.recordView).mockResolvedValue({
        _id: "rec-2",
        sessionId: "sess-abc-xyz",
        productId: "prod-B",
        viewedAt: new Date(),
      } as any);

      const recorded = await recentlyViewedService.recordView(guestIdentity, "prod-B");
      expect(recorded).toBe(true);
      expect(recentlyViewedRepository.recordView).toHaveBeenCalledWith(
        guestIdentity,
        "prod-B"
      );
    });
  });

  describe("getRecentlyViewed", () => {
    it("should return empty list when no history exists", async () => {
      vi.mocked(recentlyViewedRepository.getRecentlyViewed).mockResolvedValue([]);

      const items = await recentlyViewedService.getRecentlyViewed(customerIdentity);
      expect(items).toEqual([]);
      expect(productService.getProductPreviewsByIds).not.toHaveBeenCalled();
    });

    it("should hydrate recent products preserving viewedAt order", async () => {
      vi.mocked(recentlyViewedRepository.getRecentlyViewed).mockResolvedValue([
        { _id: "r1", productId: "prod-B", viewedAt: new Date("2026-09-26T12:00:00Z") },
        { _id: "r2", productId: "prod-A", viewedAt: new Date("2026-09-26T11:00:00Z") },
      ] as any);

      vi.mocked(productService.getProductPreviewsByIds).mockResolvedValue([
        mockPreviewB,
        mockPreviewA,
      ]);

      const items = await recentlyViewedService.getRecentlyViewed(customerIdentity);
      expect(items).toEqual([mockPreviewB, mockPreviewA]);
      expect(productService.getProductPreviewsByIds).toHaveBeenCalledWith(["prod-B", "prod-A"]);
    });

    it("should pass excludeProductId to repository to avoid circular PDP recommendation", async () => {
      vi.mocked(recentlyViewedRepository.getRecentlyViewed).mockResolvedValue([]);

      await recentlyViewedService.getRecentlyViewed(customerIdentity, {
        excludeProductId: "prod-A",
      });

      expect(recentlyViewedRepository.getRecentlyViewed).toHaveBeenCalledWith(customerIdentity, {
        excludeProductId: "prod-A",
      });
    });
  });

  describe("clearRecentlyViewed & removeItem", () => {
    it("should clear history and return deleted count", async () => {
      vi.mocked(recentlyViewedRepository.clearRecentlyViewed).mockResolvedValue(4);

      const count = await recentlyViewedService.clearRecentlyViewed(customerIdentity);
      expect(count).toBe(4);
      expect(recentlyViewedRepository.clearRecentlyViewed).toHaveBeenCalledWith(customerIdentity);
    });

    it("should remove individual item from history", async () => {
      vi.mocked(recentlyViewedRepository.removeItem).mockResolvedValue(true);

      const removed = await recentlyViewedService.removeItem(customerIdentity, "prod-A");
      expect(removed).toBe(true);
      expect(recentlyViewedRepository.removeItem).toHaveBeenCalledWith(customerIdentity, "prod-A");
    });
  });
});
