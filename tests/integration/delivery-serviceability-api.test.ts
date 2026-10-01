import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getServiceability, POST as postServiceability } from "@/app/api/delivery/serviceability/route";
import { GET as getAdminRules, POST as postAdminRules } from "@/app/api/admin/serviceability/route";
import { deliveryServiceabilityService } from "@/modules/delivery";
import { ServiceabilityState, ServiceabilitySource } from "@/modules/delivery/delivery.types";
import * as rbacModule from "@/lib/auth/rbac";
import * as rateLimitModule from "@/lib/rate-limit";
import { InsufficientPermissionError } from "@/lib/errors";

describe("Phase 16 — Delivery Serviceability API & Rate Limiting Integration Tests", () => {
  const sampleResult = {
    serviceable: true,
    state: ServiceabilityState.SERVICEABLE,
    postalCode: "600001",
    country: "IN",
    city: "Chennai",
    stateName: "Tamil Nadu",
    estimatedDeliveryDays: 3,
    source: ServiceabilitySource.CONFIGURED_RULES,
    checkedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/delivery/serviceability", () => {
    it("should return 200 with serviceability result for valid PIN code", async () => {
      vi.spyOn(deliveryServiceabilityService, "checkServiceability").mockResolvedValue(sampleResult);

      const req = new NextRequest("http://localhost:3000/api/delivery/serviceability?postalCode=600001");
      const res = await getServiceability(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.postalCode).toBe("600001");
      expect(body.data.serviceable).toBe(true);
      expect(res.headers.get("Cache-Control")).toContain("public, s-maxage=900");
    });

    it("should return INVALID_PINCODE state when given malformed postal code", async () => {
      vi.spyOn(deliveryServiceabilityService, "checkServiceability").mockResolvedValue({
        serviceable: false,
        state: ServiceabilityState.INVALID_PINCODE,
        postalCode: "012345",
        country: "IN",
        reason: "Please enter a valid 6-digit Indian PIN code (cannot start with 0)",
        source: ServiceabilitySource.CONFIGURED_RULES,
        checkedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/delivery/serviceability?postalCode=012345");
      const res = await getServiceability(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.serviceable).toBe(false);
      expect(body.data.state).toBe(ServiceabilityState.INVALID_PINCODE);
    });

    it("should enforce rate limiting and return 429 when client limit is exceeded", async () => {
      vi.spyOn(rateLimitModule, "checkRateLimit").mockReturnValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: 30,
      });

      const req = new NextRequest("http://localhost:3000/api/delivery/serviceability?postalCode=600001");
      const res = await getServiceability(req);
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("POST /api/delivery/serviceability", () => {
    it("should process POST check with optional cart context", async () => {
      const checkSpy = vi.spyOn(deliveryServiceabilityService, "checkServiceability").mockResolvedValue(sampleResult);

      const req = new NextRequest("http://localhost:3000/api/delivery/serviceability", {
        method: "POST",
        body: JSON.stringify({
          postalCode: "600001",
          country: "IN",
          cart: { totalItems: 2 },
        }),
      });

      const res = await postServiceability(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(checkSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          postalCode: "600001",
          cart: { totalItems: 2 },
        })
      );
    });
  });

  describe("Admin Serviceability APIs RBAC Protection", () => {
    it("should reject admin rules list with 403 when lacking SERVICEABILITY_READ", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockRejectedValue(
        new InsufficientPermissionError("serviceability.read")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/serviceability");
      const res = await getAdminRules(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INSUFFICIENT_PERMISSION");
    });

    it("should allow admin rule creation when granted SERVICEABILITY_UPDATE", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue({
        _id: "staff-1" as any,
        email: "logistics@verona.com",
      } as any);

      vi.spyOn(deliveryServiceabilityService, "createRule").mockResolvedValue({
        id: "rule-10",
        postalCode: "600001",
        country: "IN",
        serviceable: true,
        status: "ACTIVE",
        city: "Chennai",
        state: "Tamil Nadu",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/serviceability", {
        method: "POST",
        body: JSON.stringify({
          postalCode: "600001",
          country: "IN",
          serviceable: true,
          city: "Chennai",
          state: "Tamil Nadu",
        }),
      });

      const res = await postAdminRules(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.postalCode).toBe("600001");
    });
  });
});
