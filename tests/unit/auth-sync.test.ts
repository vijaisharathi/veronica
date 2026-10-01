import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncCustomerFromClerk } from "@/lib/auth/sync";
import { CustomerModel } from "@/db/models";
import { CustomerStatus } from "@/constants/status";

describe("Customer Authentication & Identity Synchronization Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a new customer record from Clerk user snapshot when customer does not exist", async () => {
    const mockClerkUser = {
      id: "clerk_user_12345",
      email: "newclient@example.com",
      firstName: "Elena",
      lastName: "Rostova",
      imageUrl: "https://example.com/avatar.jpg",
      phone: "+919876543210",
      emailVerified: true,
    };

    vi.spyOn(CustomerModel, "findOne").mockResolvedValue(null as any);
    const createSpy = vi.spyOn(CustomerModel, "create").mockResolvedValue({
      _id: "mongo_cust_123",
      authProviderId: mockClerkUser.id,
      email: mockClerkUser.email,
      firstName: mockClerkUser.firstName,
      lastName: mockClerkUser.lastName,
      displayName: "Elena Rostova",
      status: CustomerStatus.ACTIVE,
      emailVerified: true,
      toObject: () => ({
        _id: "mongo_cust_123",
        authProviderId: mockClerkUser.id,
        email: mockClerkUser.email,
        displayName: "Elena Rostova",
        status: CustomerStatus.ACTIVE,
      }),
    } as any);

    const customer = await syncCustomerFromClerk(mockClerkUser);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        authProviderId: "clerk_user_12345",
        email: "newclient@example.com",
        firstName: "Elena",
        lastName: "Rostova",
        displayName: "Elena Rostova",
        status: CustomerStatus.ACTIVE,
      })
    );
    expect(customer.authProviderId).toBe("clerk_user_12345");
  });

  it("should synchronize safe fields without overwriting application-owned fields for existing customer", async () => {
    const mockClerkUser = {
      id: "clerk_user_existing",
      email: "aria.sharma@example.com",
      firstName: "Aria",
      lastName: "Sharma",
      imageUrl: "https://example.com/new-avatar.jpg",
      phone: "+919820098200",
      emailVerified: true,
    };

    const mockExistingDoc = {
      _id: "mongo_aria_001",
      authProviderId: "clerk_user_existing",
      email: "aria.sharma@example.com",
      displayName: "Custom Couture Aria", // Custom application display name
      profileImage: "https://example.com/old-avatar.jpg",
      emailVerified: false,
      save: vi.fn().mockResolvedValue(true),
      toObject: () => ({
        _id: "mongo_aria_001",
        authProviderId: "clerk_user_existing",
        displayName: "Custom Couture Aria",
        profileImage: "https://example.com/new-avatar.jpg",
        emailVerified: true,
      }),
    };

    vi.spyOn(CustomerModel, "findOne").mockResolvedValue(mockExistingDoc as any);

    const result = await syncCustomerFromClerk(mockClerkUser);

    expect(mockExistingDoc.save).toHaveBeenCalled();
    expect(result.profileImage).toBe("https://example.com/new-avatar.jpg");
    expect(result.emailVerified).toBe(true);
    expect(result.displayName).toBe("Custom Couture Aria"); // Preserved!
  });
});
