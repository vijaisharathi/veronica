import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listCouponsRoute, POST as createCouponRoute } from "@/app/api/admin/coupons/route";
import {
  GET as getCouponRoute,
  PATCH as updateCouponRoute,
  DELETE as deleteCouponRoute,
} from "@/app/api/admin/coupons/[id]/route";
import { GET as listCampaignsRoute, POST as createCampaignRoute } from "@/app/api/admin/campaigns/route";
import * as rbacModule from "@/lib/auth/rbac";
import { couponService } from "@/modules/pricing/coupon.service";
import { InsufficientPermissionError, AuthenticationError, NotFoundError } from "@/lib/errors";
import { DiscountType } from "@/constants/status";

vi.mock("@/modules/pricing/coupon.service", () => ({
  couponService: {
    listCoupons: vi.fn(),
    getCouponById: vi.fn(),
    createCoupon: vi.fn(),
    updateCoupon: vi.fn(),
    deleteCoupon: vi.fn(),
    listCampaigns: vi.fn(),
    getCampaignById: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    deleteCampaign: vi.fn(),
  },
}));

describe("Phase 15 — Admin Pricing, Coupon & Campaign API Tests", () => {
  const mockStaff: any = {
    _id: "staff-1",
    email: "marketing@verona.internal",
    firstName: "Elena",
    lastName: "Rostova",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("RBAC Authorization Guards", () => {
    it("rejects unauthorized access when staff lacks COUPONS_READ permission", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockRejectedValue(
        new InsufficientPermissionError("coupons.read", "Access denied")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/coupons");
      const res = await listCouponsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("INSUFFICIENT_PERMISSION");
    });

    it("rejects unauthenticated requests with 401", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockRejectedValue(
        new AuthenticationError("Authentication required")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({ code: "SAVE10" }),
      });
      const res = await createCouponRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });
  });

  describe("Admin Coupon Operations", () => {
    it("GET /api/admin/coupons returns paginated coupon list", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      (couponService.listCoupons as any).mockResolvedValue({
        coupons: [
          {
            id: "coupon-1",
            code: "WELCOME10",
            type: DiscountType.PERCENTAGE,
            value: 10,
            active: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/coupons?page=1&limit=20");
      const res = await listCouponsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.coupons).toHaveLength(1);
      expect(json.data.coupons[0].code).toBe("WELCOME10");
    });

    it("POST /api/admin/coupons creates new coupon with audit log context", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      const mockCreatedCoupon = {
        id: "coupon-123",
        code: "VIP25",
        type: DiscountType.PERCENTAGE,
        value: 25,
        minCartValue: 500000,
        active: true,
      };
      (couponService.createCoupon as any).mockResolvedValue(mockCreatedCoupon);

      const req = new NextRequest("http://localhost:3000/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "vip25",
          type: DiscountType.PERCENTAGE,
          value: 25,
          minCartValue: 500000,
          startAt: new Date("2026-01-01").toISOString(),
          expiresAt: new Date("2026-12-31").toISOString(),
        }),
      });

      const res = await createCouponRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.code).toBe("VIP25");
      expect(couponService.createCoupon).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VIP25",
          type: DiscountType.PERCENTAGE,
          value: 25,
        }),
        expect.objectContaining({
          actorId: "staff-1",
          actorEmail: "marketing@verona.internal",
        })
      );
    });

    it("PATCH /api/admin/coupons/:id updates existing coupon", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      (couponService.updateCoupon as any).mockResolvedValue({
        id: "coupon-123",
        code: "VIP25",
        active: false,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/coupons/coupon-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const res = await updateCouponRoute(req, { params: Promise.resolve({ id: "coupon-123" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.active).toBe(false);
      expect(couponService.updateCoupon).toHaveBeenCalledWith(
        "coupon-123",
        expect.objectContaining({ active: false }),
        expect.objectContaining({ actorId: "staff-1" })
      );
    });

    it("DELETE /api/admin/coupons/:id soft deletes coupon", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      (couponService.deleteCoupon as any).mockResolvedValue({ success: true, id: "coupon-123" });

      const req = new NextRequest("http://localhost:3000/api/admin/coupons/coupon-123", {
        method: "DELETE",
      });

      const res = await deleteCouponRoute(req, { params: Promise.resolve({ id: "coupon-123" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(couponService.deleteCoupon).toHaveBeenCalledWith(
        "coupon-123",
        expect.objectContaining({ actorId: "staff-1" })
      );
    });
  });

  describe("Admin Campaign Operations", () => {
    it("POST /api/admin/campaigns creates campaign with discounts.create permission", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      const mockCreatedCampaign = {
        id: "campaign-1",
        name: "Summer Solstice",
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
      };
      (couponService.createCampaign as any).mockResolvedValue(mockCreatedCampaign);

      const req = new NextRequest("http://localhost:3000/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Summer Solstice",
          discountType: DiscountType.PERCENTAGE,
          discountValue: 15,
          startAt: new Date("2026-06-01").toISOString(),
          endAt: new Date("2026-06-30").toISOString(),
        }),
      });

      const res = await createCampaignRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Summer Solstice");
    });
  });
});
