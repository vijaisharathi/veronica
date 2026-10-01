import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyResourceOwnership, requireCustomerOwnership } from "@/lib/auth/ownership";
import * as sessionModule from "@/lib/auth/session";
import { ResourceAccessDeniedError, AuthenticationError } from "@/lib/errors";
import { ICustomer } from "@/types/database";
import { CustomerStatus } from "@/constants/status";

describe("Resource Ownership & IDOR Protection Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("verifyResourceOwnership", () => {
    it("should allow access when customer ID matches resource owner string ID", () => {
      expect(() => {
        verifyResourceOwnership("cust_12345", "cust_12345");
      }).not.toThrow();
    });

    it("should allow access when resource owner has a toString() method (e.g., ObjectId)", () => {
      const mockObjectId = {
        toString: () => "cust_12345",
      };
      expect(() => {
        verifyResourceOwnership("cust_12345", mockObjectId);
      }).not.toThrow();
    });

    it("should throw ResourceAccessDeniedError (403) when customer tries to access another customer's resource", () => {
      expect(() => {
        verifyResourceOwnership("cust_attacker", "cust_victim");
      }).toThrow(ResourceAccessDeniedError);

      try {
        verifyResourceOwnership("cust_attacker", "cust_victim");
      } catch (err) {
        expect(err).toBeInstanceOf(ResourceAccessDeniedError);
        const resourceError = err as ResourceAccessDeniedError;
        expect(resourceError.statusCode).toBe(403);
        expect(resourceError.code).toBe("RESOURCE_ACCESS_DENIED");
      }
    });

    it("should prevent IDOR for empty or mismatched string IDs", () => {
      expect(() => {
        verifyResourceOwnership("cust_123", "");
      }).toThrow(ResourceAccessDeniedError);
    });
  });

  describe("requireCustomerOwnership Server Guard", () => {
    const mockCustomer: ICustomer = {
      _id: "cust_valid_123",
      authProviderId: "clerk_valid_123",
      email: "shopper@example.com",
      firstName: "Aarav",
      lastName: "Patel",
      displayName: "Aarav Patel",
      phone: "+919876543210",
      status: CustomerStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
      preferences: {
        marketingEmail: false,
        marketingSms: false,
        marketingWhatsapp: false,
      },
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return customer if authenticated and resource owner matches", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);

      const result = await requireCustomerOwnership("cust_valid_123");
      expect(result).toBe(mockCustomer);
      expect(result._id).toBe("cust_valid_123");
    });

    it("should reject and throw ResourceAccessDeniedError if authenticated customer is different", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);

      await expect(requireCustomerOwnership("cust_other_456")).rejects.toThrow(
        ResourceAccessDeniedError
      );
    });

    it("should propagate AuthenticationError if caller is not authenticated", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockRejectedValue(
        new AuthenticationError("Customer authentication required")
      );

      await expect(requireCustomerOwnership("cust_valid_123")).rejects.toThrow(
        AuthenticationError
      );
    });
  });
});
