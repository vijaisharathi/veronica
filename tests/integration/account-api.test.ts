import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/account/profile/route";
import { GET as getPreferences, PATCH as patchPreferences } from "@/app/api/account/preferences/route";
import * as sessionModule from "@/lib/auth/session";
import { CustomerModel } from "@/db/models";
import { AuthenticationError } from "@/lib/errors";
import { CustomerStatus } from "@/constants/status";
import { ICustomer } from "@/types/database";

describe("Account APIs Integration & Self-Access Enforcement", () => {
  const mockCustomer: ICustomer = {
    _id: "660000000000000000000001" as any,
    authProviderId: "user_clerk_123",
    email: "ananya.roy@example.com",
    firstName: "Ananya",
    lastName: "Roy",
    displayName: "Ananya Roy",
    phone: "+919876543210",
    profileImage: "https://example.com/avatar.jpg",
    status: CustomerStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
    preferences: {
      marketingEmail: true,
      marketingSms: false,
      marketingWhatsapp: true,
    },
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/account/profile", () => {
    it("should return 401 when request is unauthenticated", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockRejectedValue(
        new AuthenticationError("Customer authentication required")
      );

      const response = await getProfile();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("should return 200 with customer profile DTO when authenticated", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);

      const response = await getProfile();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe("ananya.roy@example.com");
      expect(body.data.displayName).toBe("Ananya Roy");
      expect(body.data.id).toBe("660000000000000000000001");
      expect(body.data.authProviderId).toBeUndefined(); // sensitive internals not leaked
    });
  });

  describe("PATCH /api/account/profile", () => {
    it("should return 401 when request is unauthenticated", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockRejectedValue(
        new AuthenticationError("Customer authentication required")
      );

      const req = new NextRequest("http://localhost:3000/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName: "NewName" }),
      });

      const response = await patchProfile(req);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("should return 400 when invalid fields are provided", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);

      const req = new NextRequest("http://localhost:3000/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName: "" }), // empty string fails min(1)
      });

      const response = await patchProfile(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should update allowed profile fields and return 200", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);

      const updatedDoc = {
        ...mockCustomer,
        firstName: "Ananya",
        lastName: "Sharma",
        displayName: "Ananya Sharma",
      };

      vi.spyOn(CustomerModel, "findByIdAndUpdate").mockReturnValue({
        lean: vi.fn().mockResolvedValue(updatedDoc),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ lastName: "Sharma" }),
      });

      const response = await patchProfile(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.lastName).toBe("Sharma");
      expect(body.data.displayName).toBe("Ananya Sharma");
    });
  });

  describe("GET /api/account/preferences", () => {
    it("should return 401 when request is unauthenticated", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockRejectedValue(
        new AuthenticationError("Customer authentication required")
      );

      const response = await getPreferences();
      expect(response.status).toBe(401);
    });

    it("should return 200 with customer preferences", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);

      const response = await getPreferences();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.marketingEmail).toBe(true);
      expect(body.data.marketingWhatsapp).toBe(true);
    });
  });

  describe("PATCH /api/account/preferences", () => {
    it("should update marketing preferences and return 200", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);

      const updatedDoc = {
        ...mockCustomer,
        preferences: {
          marketingEmail: false,
          marketingSms: false,
          marketingWhatsapp: false,
        },
      };

      vi.spyOn(CustomerModel, "findByIdAndUpdate").mockReturnValue({
        lean: vi.fn().mockResolvedValue(updatedDoc),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/account/preferences", {
        method: "PATCH",
        body: JSON.stringify({ marketingEmail: false, marketingWhatsapp: false }),
      });

      const response = await patchPreferences(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.marketingEmail).toBe(false);
      expect(body.data.marketingWhatsapp).toBe(false);
    });
  });
});
