import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getWishlistRoute, POST as addToWishlistRoute, DELETE as clearWishlistRoute } from "@/app/api/wishlist/route";
import { DELETE as removeWishlistItemRoute } from "@/app/api/wishlist/[productId]/route";
import { GET as getWishlistStatusRoute } from "@/app/api/wishlist/status/route";
import { requireCustomer, getCurrentCustomer } from "@/lib/auth/session";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { AuthenticationError, NotFoundError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCustomer: vi.fn(),
  getCurrentCustomer: vi.fn(),
}));

vi.mock("@/modules/wishlist/wishlist.service", () => ({
  wishlistService: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    getWishlistStatusForProducts: vi.fn(),
    clearWishlist: vi.fn(),
  },
}));

describe("Phase 13 — Wishlist API Integration Tests", () => {
  const customerId = "cust-123";
  const mockCustomer = { _id: customerId, email: "client@verona.com" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/wishlist", () => {
    it("should return 401 when customer is unauthenticated", async () => {
      vi.mocked(requireCustomer).mockRejectedValue(
        new AuthenticationError("Customer authentication required")
      );

      const res = await getWishlistRoute();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("should return 200 with customer wishlist items when authenticated", async () => {
      vi.mocked(requireCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(wishlistService.getWishlist).mockResolvedValue({
        items: [
          {
            id: "item-1",
            wishlistId: "w-1",
            customerId,
            productId: "prod-1",
            addedAt: new Date().toISOString(),
            product: { id: "prod-1", title: "Linen Shirt" } as any,
          },
        ],
        count: 1,
      });

      const res = await getWishlistRoute();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.count).toBe(1);
      expect(json.data.items[0].productId).toBe("prod-1");
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });
  });

  describe("POST /api/wishlist", () => {
    it("should return 400 when body does not contain valid productId", async () => {
      vi.mocked(requireCustomer).mockResolvedValue(mockCustomer);

      const req = new NextRequest("http://localhost/api/wishlist", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await addToWishlistRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 when product does not exist", async () => {
      vi.mocked(requireCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(wishlistService.addToWishlist).mockRejectedValue(
        new NotFoundError("Product", "prod-404")
      );

      const req = new NextRequest("http://localhost/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-404" }),
      });

      const res = await addToWishlistRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("should return 201 when item is successfully added to wishlist", async () => {
      vi.mocked(requireCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(wishlistService.addToWishlist).mockResolvedValue({
        id: "item-new",
        wishlistId: "w-1",
        customerId,
        productId: "prod-1",
        addedAt: new Date().toISOString(),
        product: { id: "prod-1", title: "Linen Shirt" } as any,
      });

      const req = new NextRequest("http://localhost/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-1" }),
      });

      const res = await addToWishlistRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.productId).toBe("prod-1");
    });
  });

  describe("DELETE /api/wishlist/:productId", () => {
    it("should return 200 and remove item for authenticated customer", async () => {
      vi.mocked(requireCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(wishlistService.removeFromWishlist).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/wishlist/prod-1", {
        method: "DELETE",
      });

      const res = await removeWishlistItemRoute(req, {
        params: Promise.resolve({ productId: "prod-1" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.removed).toBe(true);
      expect(json.data.productId).toBe("prod-1");
      expect(wishlistService.removeFromWishlist).toHaveBeenCalledWith(customerId, "prod-1");
    });
  });

  describe("GET /api/wishlist/status", () => {
    it("should return empty status map when unauthenticated without error", async () => {
      vi.mocked(getCurrentCustomer).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/wishlist/status?productIds=p1,p2");
      const res = await getWishlistStatusRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual({ p1: false, p2: false });
    });

    it("should batch return wishlist status for authenticated customer", async () => {
      vi.mocked(getCurrentCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(wishlistService.getWishlistStatusForProducts).mockResolvedValue({
        p1: true,
        p2: false,
      });

      const req = new NextRequest("http://localhost/api/wishlist/status?productIds=p1,p2");
      const res = await getWishlistStatusRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual({ p1: true, p2: false });
    });
  });

  describe("DELETE /api/wishlist (clear)", () => {
    it("should clear customer wishlist", async () => {
      vi.mocked(requireCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(wishlistService.clearWishlist).mockResolvedValue(3);

      const res = await clearWishlistRoute();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.cleared).toBe(3);
    });
  });
});
