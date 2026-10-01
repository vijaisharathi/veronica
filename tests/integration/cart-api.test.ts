import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCartRoute, DELETE as clearCartRoute } from "@/app/api/cart/route";
import { POST as addCartItemRoute } from "@/app/api/cart/items/route";
import {
  PATCH as updateCartItemRoute,
  DELETE as removeCartItemRoute,
} from "@/app/api/cart/items/[itemId]/route";
import { POST as moveToWishlistRoute } from "@/app/api/cart/items/[itemId]/move-to-wishlist/route";
import { GET as getCartCountRoute } from "@/app/api/cart/count/route";
import { cartService } from "@/modules/cart/cart.service";
import { getViewerIdentity } from "@/lib/session";
import { requireCustomer } from "@/lib/auth/session";
import { AuthenticationError, NotFoundError, AuthorizationError } from "@/lib/errors";
import { CartDTO } from "@/modules/cart/cart.types";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/session", () => ({
  getViewerIdentity: vi.fn(),
  SESSION_COOKIE_NAME: "verona_session_id",
}));

vi.mock("@/lib/auth/session", () => ({
  requireCustomer: vi.fn(),
  getCurrentCustomer: vi.fn(),
}));

vi.mock("@/modules/cart/cart.service", () => ({
  cartService: {
    getCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    moveToWishlist: vi.fn(),
    mergeGuestCart: vi.fn(),
    getCartCount: vi.fn(),
  },
}));

const mockCartDTO: CartDTO = {
  id: "507f1f77bcf86cd799439011",
  status: "ACTIVE",
  items: [
    {
      id: "507f1f77bcf86cd799439012",
      cartId: "507f1f77bcf86cd799439011",
      productId: "507f1f77bcf86cd799439013",
      variantId: "507f1f77bcf86cd799439014",
      productName: "Classic Linen Shirt",
      slug: "classic-linen-shirt",
      image: "/images/linen.jpg",
      brand: "VÉRONA",
      selectedColor: "Sage",
      selectedSize: "M",
      sku: "CLS-SGE-M",
      quantity: 1,
      unitPriceMinor: 450000,
      unitPriceMajor: 4500,
      lineTotalMinor: 450000,
      lineTotalMajor: 4500,
      priceChanged: false,
      availability: "AVAILABLE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  itemCount: 1,
  distinctItemCount: 1,
  totals: {
    subtotalMinor: 450000,
    subtotalMajor: 4500,
    promotionDiscountMinor: 0,
    promotionDiscountMajor: 0,
    couponDiscountMinor: 0,
    couponDiscountMajor: 0,
    discountMinor: 0,
    discountMajor: 0,
    shippingMinor: 0,
    taxMinor: 0,
    grandTotalMinor: 450000,
    grandTotalMajor: 4500,
    currency: "INR",
  },
  hasUnavailableItems: false,
  hasPriceChanges: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Phase 14 — Cart API Integration Tests", () => {
  const customerId = "507f1f77bcf86cd799439099";
  const itemId = "507f1f77bcf86cd799439012";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/cart", () => {
    it("should return 200 with cart DTO and private cache headers for guest viewer", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { sessionId: "guest-uuid-1" },
        newSessionId: "guest-uuid-1",
      });
      vi.mocked(cartService.getCart).mockResolvedValue(mockCartDTO);

      const res = await getCartRoute();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.itemCount).toBe(1);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
      expect(res.headers.get("Set-Cookie")).toContain("verona_session_id=guest-uuid-1");
    });

    it("should trigger guest cart merge if customer is authenticated and guest cookie exists", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { customerId },
        guestSessionId: "guest-uuid-old",
      });
      vi.mocked(cartService.mergeGuestCart).mockResolvedValue(mockCartDTO);
      vi.mocked(cartService.getCart).mockResolvedValue(mockCartDTO);

      const res = await getCartRoute();
      expect(res.status).toBe(200);
      expect(cartService.mergeGuestCart).toHaveBeenCalledWith(customerId, "guest-uuid-old");
    });
  });

  describe("POST /api/cart/items", () => {
    it("should return 400 when payload fails validation", async () => {
      const req = new NextRequest("http://localhost/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          productId: "invalid-id",
          variantId: "invalid-variant",
          quantity: -1,
        }),
      });

      const res = await addCartItemRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 201 with updated cart when item is added successfully", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { customerId },
      });
      vi.mocked(cartService.addItem).mockResolvedValue(mockCartDTO);

      const req = new NextRequest("http://localhost/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          productId: "507f1f77bcf86cd799439013",
          variantId: "507f1f77bcf86cd799439014",
          quantity: 1,
        }),
      });

      const res = await addCartItemRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
    });
  });

  describe("PATCH /api/cart/items/:itemId", () => {
    it("should return 400 when quantity is invalid", async () => {
      const req = new NextRequest(`http://localhost/api/cart/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: 15 }), // Exceeds max 10
      });

      const res = await updateCartItemRoute(req, {
        params: Promise.resolve({ itemId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should return 200 with updated cart when quantity is valid", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { customerId },
      });
      const existingItem = mockCartDTO.items[0]!;
      vi.mocked(cartService.updateItemQuantity).mockResolvedValue({
        ...mockCartDTO,
        items: [{ ...existingItem, quantity: 3 }],
        itemCount: 3,
      });

      const req = new NextRequest(`http://localhost/api/cart/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: 3 }),
      });

      const res = await updateCartItemRoute(req, {
        params: Promise.resolve({ itemId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.itemCount).toBe(3);
    });
  });

  describe("DELETE /api/cart/items/:itemId", () => {
    it("should return 200 and remove item from cart", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { customerId },
      });
      vi.mocked(cartService.removeItem).mockResolvedValue({
        ...mockCartDTO,
        items: [],
        itemCount: 0,
      });

      const req = new NextRequest(`http://localhost/api/cart/items/${itemId}`, {
        method: "DELETE",
      });

      const res = await removeCartItemRoute(req, {
        params: Promise.resolve({ itemId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(0);
    });
  });

  describe("DELETE /api/cart", () => {
    it("should return 200 and clear active cart", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { customerId },
      });
      vi.mocked(cartService.clearCart).mockResolvedValue({
        ...mockCartDTO,
        items: [],
        itemCount: 0,
      });

      const res = await clearCartRoute();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.itemCount).toBe(0);
    });
  });

  describe("POST /api/cart/items/:itemId/move-to-wishlist", () => {
    it("should return 401 when customer is not authenticated", async () => {
      vi.mocked(requireCustomer).mockRejectedValue(
        new AuthenticationError("Customer authentication required")
      );

      const req = new NextRequest(`http://localhost/api/cart/items/${itemId}/move-to-wishlist`, {
        method: "POST",
      });

      const res = await moveToWishlistRoute(req, {
        params: Promise.resolve({ itemId }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("should return 200 and move garment to wishlist for authenticated customer", async () => {
      vi.mocked(requireCustomer).mockResolvedValue({
        _id: customerId,
        email: "client@verona.com",
      } as any);
      vi.mocked(cartService.moveToWishlist).mockResolvedValue({
        ...mockCartDTO,
        items: [],
        itemCount: 0,
      });

      const req = new NextRequest(`http://localhost/api/cart/items/${itemId}/move-to-wishlist`, {
        method: "POST",
      });

      const res = await moveToWishlistRoute(req, {
        params: Promise.resolve({ itemId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(cartService.moveToWishlist).toHaveBeenCalledWith(customerId, itemId);
    });
  });

  describe("GET /api/cart/count", () => {
    it("should return 200 with total item quantity count", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { customerId },
      });
      vi.mocked(cartService.getCartCount).mockResolvedValue({ itemCount: 4 });

      const res = await getCartCountRoute();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.itemCount).toBe(4);
    });
  });
});
