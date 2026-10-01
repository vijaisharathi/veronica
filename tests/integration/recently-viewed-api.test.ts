import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as getRecentlyViewedRoute,
  POST as recordRecentlyViewedRoute,
  DELETE as clearRecentlyViewedRoute,
} from "@/app/api/recently-viewed/route";
import { DELETE as removeRecentItemRoute } from "@/app/api/recently-viewed/[productId]/route";
import { getViewerIdentity } from "@/lib/session";
import { recentlyViewedService } from "@/modules/wishlist/recently-viewed.service";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/session", () => ({
  getViewerIdentity: vi.fn(),
  SESSION_COOKIE_NAME: "verona_session_id",
}));

vi.mock("@/modules/wishlist/recently-viewed.service", () => ({
  recentlyViewedService: {
    getRecentlyViewed: vi.fn(),
    recordView: vi.fn(),
    clearRecentlyViewed: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe("Phase 13 — Recently Viewed API Integration Tests", () => {
  const mockIdentity = { customerId: "cust-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getViewerIdentity).mockResolvedValue({
      identity: mockIdentity,
    });
  });

  describe("GET /api/recently-viewed", () => {
    it("should return 200 with recently viewed products", async () => {
      vi.mocked(recentlyViewedService.getRecentlyViewed).mockResolvedValue([
        { id: "prod-1", title: "Linen Shirt" } as any,
      ]);

      const req = new NextRequest("http://localhost/api/recently-viewed?exclude=prod-current&limit=8");
      const res = await getRecentlyViewedRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.count).toBe(1);
      expect(json.data.items[0].id).toBe("prod-1");
      expect(recentlyViewedService.getRecentlyViewed).toHaveBeenCalledWith(mockIdentity, {
        excludeProductId: "prod-current",
        limit: 8,
      });
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });

    it("should set session cookie if a new guest session was created", async () => {
      vi.mocked(getViewerIdentity).mockResolvedValue({
        identity: { sessionId: "sess-new-123" },
        newSessionId: "sess-new-123",
      });
      vi.mocked(recentlyViewedService.getRecentlyViewed).mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/recently-viewed");
      const res = await getRecentlyViewedRoute(req);

      expect(res.status).toBe(200);
      const cookie = res.cookies.get("verona_session_id");
      expect(cookie?.value).toBe("sess-new-123");
    });
  });

  describe("POST /api/recently-viewed", () => {
    it("should return 400 when body does not have valid productId", async () => {
      const req = new NextRequest("http://localhost/api/recently-viewed", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await recordRecentlyViewedRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 200 when view is successfully recorded", async () => {
      vi.mocked(recentlyViewedService.recordView).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/recently-viewed", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-1" }),
      });

      const res = await recordRecentlyViewedRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.recorded).toBe(true);
      expect(json.data.productId).toBe("prod-1");
      expect(recentlyViewedService.recordView).toHaveBeenCalledWith(mockIdentity, "prod-1");
    });
  });

  describe("DELETE /api/recently-viewed", () => {
    it("should clear history for viewer identity", async () => {
      vi.mocked(recentlyViewedService.clearRecentlyViewed).mockResolvedValue(6);

      const res = await clearRecentlyViewedRoute();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.cleared).toBe(6);
      expect(recentlyViewedService.clearRecentlyViewed).toHaveBeenCalledWith(mockIdentity);
    });
  });

  describe("DELETE /api/recently-viewed/:productId", () => {
    it("should remove individual product from history", async () => {
      vi.mocked(recentlyViewedService.removeItem).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/recently-viewed/prod-1", {
        method: "DELETE",
      });

      const res = await removeRecentItemRoute(req, {
        params: Promise.resolve({ productId: "prod-1" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.removed).toBe(true);
      expect(json.data.productId).toBe("prod-1");
      expect(recentlyViewedService.removeItem).toHaveBeenCalledWith(mockIdentity, "prod-1");
    });
  });
});
