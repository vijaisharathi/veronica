import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getActiveCheckout, POST as initializeCheckout } from "@/app/api/checkout/route";
import { GET as getCheckoutById } from "@/app/api/checkout/[id]/route";
import { PATCH as selectAddress } from "@/app/api/checkout/[id]/address/route";
import { POST as validateCheckout } from "@/app/api/checkout/[id]/validate/route";
import { POST as getPaymentReadyContract } from "@/app/api/checkout/[id]/payment-ready/route";
import * as authModule from "@/lib/auth/session";
import { checkoutService } from "@/modules/checkout";
import { AuthenticationError, AuthorizationError, ValidationError } from "@/lib/errors";
import { ICustomer } from "@/types/database";

describe("Phase 17 — Checkout API Route Handlers Integration Tests", () => {
  const customerId = "507f1f77bcf86cd799439011";
  const sessionId = "507f1f77bcf86cd799439055";
  const addressId = "507f1f77bcf86cd799439077";

  const mockCustomer: ICustomer = {
    _id: customerId as any,
    authProviderId: "clerk_customer_aria",
    email: "aria.sharma@example.com",
    firstName: "Aria",
    lastName: "Sharma",
    displayName: "Aria Sharma",
    status: "ACTIVE" as any,
    emailVerified: true,
    phoneVerified: true,
    preferences: {} as any,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCheckoutDTO = {
    id: sessionId,
    customerId,
    cartId: "507f1f77bcf86cd799439033",
    status: "ACTIVE",
    selectedAddressId: addressId,
    addressSnapshot: {
      addressId,
      fullName: "Aria Sharma",
      phone: "+91 98200 98200",
      postalCode: "400020",
    },
    items: [],
    pricing: {
      subtotalMinor: 249900,
      amountDueBeforePaymentMinor: 249900,
      currency: "INR",
      pricingVersion: "v_1",
    },
    appliedCoupon: null,
    serviceability: {
      postalCode: "400020",
      serviceable: true,
    },
    issues: [],
    isValid: true,
    canProceedToPayment: true,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/checkout", () => {
    it("returns 401 if unauthenticated", async () => {
      vi.spyOn(authModule, "requireCustomer").mockRejectedValueOnce(
        new AuthenticationError("Customer authentication required")
      );

      const res = await getActiveCheckout();
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("returns 200 with active checkout session", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(checkoutService, "getActiveCheckout").mockResolvedValueOnce(mockCheckoutDTO as any);

      const res = await getActiveCheckout();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(sessionId);
      expect(res.headers.get("Cache-Control")).toContain("private");
    });
  });

  describe("POST /api/checkout", () => {
    it("initializes checkout session for authenticated customer", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(checkoutService, "initializeCheckout").mockResolvedValueOnce(mockCheckoutDTO as any);

      const req = new NextRequest("http://localhost:3000/api/checkout", {
        method: "POST",
        body: JSON.stringify({ addressId }),
      });

      const res = await initializeCheckout(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(sessionId);
      expect(checkoutService.initializeCheckout).toHaveBeenCalledWith(customerId, addressId);
    });
  });

  describe("GET /api/checkout/[id]", () => {
    it("returns 403 when customer does not own the session", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(checkoutService, "getCheckout").mockRejectedValueOnce(
        new AuthorizationError("Access denied: You do not own this checkout session", "CHECKOUT_NOT_OWNED")
      );

      const req = new NextRequest(`http://localhost:3000/api/checkout/${sessionId}`);
      const res = await getCheckoutById(req, { params: Promise.resolve({ id: sessionId }) });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CHECKOUT_NOT_OWNED");
    });

    it("returns 200 with checkout DTO when owned", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(checkoutService, "getCheckout").mockResolvedValueOnce(mockCheckoutDTO as any);

      const req = new NextRequest(`http://localhost:3000/api/checkout/${sessionId}`);
      const res = await getCheckoutById(req, { params: Promise.resolve({ id: sessionId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(sessionId);
    });
  });

  describe("PATCH /api/checkout/[id]/address", () => {
    it("rejects invalid request body with 400", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);

      const req = new NextRequest(`http://localhost:3000/api/checkout/${sessionId}/address`, {
        method: "PATCH",
        body: JSON.stringify({ addressId: "invalid-id" }),
      });

      const res = await selectAddress(req, { params: Promise.resolve({ id: sessionId }) });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("selects valid address and returns updated DTO", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(checkoutService, "selectAddress").mockResolvedValueOnce(mockCheckoutDTO as any);

      const req = new NextRequest(`http://localhost:3000/api/checkout/${sessionId}/address`, {
        method: "PATCH",
        body: JSON.stringify({ addressId }),
      });

      const res = await selectAddress(req, { params: Promise.resolve({ id: sessionId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(checkoutService.selectAddress).toHaveBeenCalledWith(customerId, sessionId, addressId);
    });
  });

  describe("POST /api/checkout/[id]/validate", () => {
    it("returns validation result structure", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(checkoutService, "validateCheckout").mockResolvedValueOnce({
        valid: true,
        checkout: mockCheckoutDTO as any,
        issues: [],
      });

      const req = new NextRequest(`http://localhost:3000/api/checkout/${sessionId}/validate`, {
        method: "POST",
      });

      const res = await validateCheckout(req, { params: Promise.resolve({ id: sessionId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
      expect(body.data.issues).toEqual([]);
    });
  });

  describe("POST /api/checkout/[id]/payment-ready", () => {
    it("returns locked PaymentReadyCheckout contract", async () => {
      const mockContract = {
        checkoutSessionId: sessionId,
        customerId,
        cartId: "507f1f77bcf86cd799439033",
        currency: "INR",
        amountMinor: 249900,
        pricingVersion: "v_1",
        addressSnapshot: mockCheckoutDTO.addressSnapshot,
        serviceabilitySnapshot: mockCheckoutDTO.serviceability,
        items: [],
        appliedCouponCode: null,
      };

      vi.spyOn(authModule, "requireCustomer").mockResolvedValueOnce(mockCustomer);
      vi.spyOn(checkoutService, "getPaymentReadyContract").mockResolvedValueOnce(mockContract as any);

      const req = new NextRequest(`http://localhost:3000/api/checkout/${sessionId}/payment-ready`, {
        method: "POST",
      });

      const res = await getPaymentReadyContract(req, { params: Promise.resolve({ id: sessionId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.paymentReadyCheckout.amountMinor).toBe(249900);
      expect(body.data.paymentReadyCheckout.currency).toBe("INR");
    });
  });
});
