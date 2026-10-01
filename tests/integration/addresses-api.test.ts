import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listAddresses, POST as createAddress } from "@/app/api/addresses/route";
import {
  GET as getAddress,
  PATCH as patchAddress,
  DELETE as deleteAddress,
} from "@/app/api/addresses/[id]/route";
import { PATCH as setDefaultAddress } from "@/app/api/addresses/[id]/default/route";
import * as sessionModule from "@/lib/auth/session";
import { addressService } from "@/modules/addresses";
import { AuthenticationError, AddressNotOwnedError, AddressNotFoundError } from "@/lib/errors";
import { AddressType } from "@/constants/status";
import { ICustomer } from "@/types/database";

describe("Phase 16 — Address APIs Integration & Ownership Protection", () => {
  const customerAId = "507f1f77bcf86cd799439011";
  const customerBId = "507f1f77bcf86cd799439022";

  const mockCustomerA: ICustomer = {
    _id: customerAId as any,
    authProviderId: "clerk_customer_a",
    email: "client.a@verona.com",
    firstName: "Aria",
    lastName: "Sharma",
    displayName: "Aria Sharma",
    phone: "+91 98200 98200",
    status: "ACTIVE" as any,
    emailVerified: true,
    phoneVerified: true,
    preferences: {} as any,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleAddressDTO = {
    id: "507f1f77bcf86cd799439055",
    customerId: customerAId,
    type: AddressType.HOME,
    fullName: "Aria Sharma",
    phone: "+91 98200 98200",
    addressLine1: "123 Marine Drive",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400020",
    country: "India",
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/addresses", () => {
    it("should return 401 when request is unauthenticated", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockRejectedValue(
        new AuthenticationError("Customer authentication required")
      );

      const res = await listAddresses();
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("should return 200 with customer address list and private cache headers", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomerA);
      vi.spyOn(addressService, "listAddresses").mockResolvedValue([sampleAddressDTO]);

      const res = await listAddresses();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(res.headers.get("Cache-Control")).toContain("private, no-store");
    });
  });

  describe("POST /api/addresses & Ownership Anti-Spoofing", () => {
    it("should create address associating it strictly with authenticated customer", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomerA);
      const createSpy = vi.spyOn(addressService, "createAddress").mockResolvedValue(sampleAddressDTO);

      // Attempt client identity spoofing by passing customerId of Customer B
      const req = new NextRequest("http://localhost:3000/api/addresses", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerBId,
          userId: "malicious_user",
          fullName: "Aria Sharma",
          phone: "9820098200",
          addressLine1: "123 Marine Drive",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400020",
        }),
      });

      const res = await createAddress(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);

      // Ensure customerId was derived exclusively from session, NOT from request body
      expect(createSpy).toHaveBeenCalledWith(
        customerAId,
        expect.not.objectContaining({ customerId: customerBId, userId: "malicious_user" })
      );
    });
  });

  describe("IDOR Protection on Single Address Routes (/api/addresses/[id])", () => {
    it("should return 403 when Customer B attempts to access Customer A address", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue({
        ...mockCustomerA,
        _id: customerBId as any,
      });
      vi.spyOn(addressService, "getAddress").mockRejectedValue(new AddressNotOwnedError());

      const req = new NextRequest("http://localhost:3000/api/addresses/507f1f77bcf86cd799439055");
      const res = await getAddress(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439055" }),
      });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("ADDRESS_NOT_OWNED");
    });

    it("should return 404 when address does not exist", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomerA);
      vi.spyOn(addressService, "getAddress").mockRejectedValue(
        new AddressNotFoundError("507f1f77bcf86cd799439099")
      );

      const req = new NextRequest("http://localhost:3000/api/addresses/507f1f77bcf86cd799439099");
      const res = await getAddress(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("ADDRESS_NOT_FOUND");
    });

    it("should return 200 when updating an owned address", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomerA);
      vi.spyOn(addressService, "updateAddress").mockResolvedValue({
        ...sampleAddressDTO,
        city: "Pune",
      });

      const req = new NextRequest("http://localhost:3000/api/addresses/507f1f77bcf86cd799439055", {
        method: "PATCH",
        body: JSON.stringify({ city: "Pune" }),
      });

      const res = await patchAddress(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439055" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.city).toBe("Pune");
    });

    it("should return 200 when deleting an owned address", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomerA);
      vi.spyOn(addressService, "deleteAddress").mockResolvedValue({
        deleted: true,
        newDefaultAddressId: "507f1f77bcf86cd799439066",
      });

      const req = new NextRequest("http://localhost:3000/api/addresses/507f1f77bcf86cd799439055", {
        method: "DELETE",
      });

      const res = await deleteAddress(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439055" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
      expect(body.data.newDefaultAddressId).toBe("507f1f77bcf86cd799439066");
    });
  });

  describe("PATCH /api/addresses/[id]/default", () => {
    it("should atomically designate address as default", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomerA);
      vi.spyOn(addressService, "setDefaultAddress").mockResolvedValue({
        ...sampleAddressDTO,
        isDefault: true,
      });

      const req = new NextRequest("http://localhost:3000/api/addresses/507f1f77bcf86cd799439055/default", {
        method: "PATCH",
      });

      const res = await setDefaultAddress(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439055" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.isDefault).toBe(true);
    });
  });
});
