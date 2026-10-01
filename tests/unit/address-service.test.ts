import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddressService } from "@/modules/addresses/address.service";
import { AddressRepository } from "@/modules/addresses/address.repository";
import { AddressType } from "@/constants/status";
import { IAddress } from "@/types/database";
import { AddressNotFoundError, AddressNotOwnedError, ValidationError } from "@/lib/errors";

describe("Phase 16 — Address Domain Service Unit Tests", () => {
  let mockRepo: AddressRepository;
  let service: AddressService;

  const customerId = "507f1f77bcf86cd799439011";
  const otherCustomerId = "507f1f77bcf86cd799439099";

  const mockAddress1: IAddress = {
    _id: "507f1f77bcf86cd799439021" as any,
    customerId: customerId as any,
    type: AddressType.HOME,
    fullName: "Aria Sharma",
    phone: "+91 9820098200",
    addressLine1: "123 Marine Drive",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400020",
    isDefault: true,
    isDeleted: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  const mockAddress2: IAddress = {
    _id: "507f1f77bcf86cd799439022" as any,
    customerId: customerId as any,
    type: AddressType.WORK,
    fullName: "Aria Sharma",
    phone: "+91 9820098200",
    addressLine1: "456 Tech Park",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    pincode: "560001",
    isDefault: false,
    isDeleted: false,
    createdAt: new Date("2026-01-02T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  };

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByCustomerAndId: vi.fn(),
      listByCustomer: vi.fn(),
      countByCustomer: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      unsetCustomerDefaults: vi.fn(),
      setDefault: vi.fn(),
      findDefault: vi.fn(),
      findLatestActive: vi.fn(),
    } as unknown as AddressRepository;

    service = new AddressService(mockRepo);
  });

  describe("listAddresses", () => {
    it("should return formatted AddressDTO array for customer", async () => {
      vi.mocked(mockRepo.listByCustomer).mockResolvedValue([mockAddress1, mockAddress2]);

      const result = await service.listAddresses(customerId);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("507f1f77bcf86cd799439021");
      expect(result[0]?.postalCode).toBe("400020");
      expect(result[0]?.isDefault).toBe(true);
      expect(result[1]?.isDefault).toBe(false);
    });

    it("should throw ValidationError if customerId is missing", async () => {
      await expect(service.listAddresses("")).rejects.toThrow(ValidationError);
    });
  });

  describe("createAddress", () => {
    it("should automatically set first address as default when count is 0", async () => {
      vi.mocked(mockRepo.countByCustomer).mockResolvedValue(0);
      vi.mocked(mockRepo.create).mockResolvedValue(mockAddress1);

      const result = await service.createAddress(customerId, {
        fullName: "Aria Sharma",
        phone: "9820098200",
        addressLine1: "123 Marine Drive",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400020",
        isDefault: false, // Explicitly false, but count is 0 so must become default
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId,
          isDefault: true,
          pincode: "400020",
        })
      );
      expect(result.isDefault).toBe(true);
    });

    it("should unset other defaults when new address is designated as default", async () => {
      vi.mocked(mockRepo.countByCustomer).mockResolvedValue(1);
      vi.mocked(mockRepo.create).mockResolvedValue({
        ...mockAddress2,
        isDefault: true,
      });

      await service.createAddress(customerId, {
        fullName: "Aria Sharma",
        phone: "9820098200",
        addressLine1: "456 Tech Park",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        isDefault: true,
      });

      expect(mockRepo.unsetCustomerDefaults).toHaveBeenCalledWith(customerId);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId,
          isDefault: true,
        })
      );
    });
  });

  describe("updateAddress & IDOR Protection", () => {
    it("should throw AddressNotOwnedError if address belongs to another customer", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockAddress1);

      await expect(
        service.updateAddress(otherCustomerId, "507f1f77bcf86cd799439021", {
          city: "Pune",
        })
      ).rejects.toThrow(AddressNotOwnedError);
    });

    it("should throw AddressNotFoundError if address does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(
        service.updateAddress(customerId, "507f1f77bcf86cd799439099", {
          city: "Pune",
        })
      ).rejects.toThrow(AddressNotFoundError);
    });

    it("should update fields and unset defaults if updated to default", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockAddress2);
      vi.mocked(mockRepo.update).mockResolvedValue({
        ...mockAddress2,
        isDefault: true,
      });

      const result = await service.updateAddress(customerId, "507f1f77bcf86cd799439022", {
        isDefault: true,
      });

      expect(mockRepo.unsetCustomerDefaults).toHaveBeenCalledWith(
        customerId,
        "507f1f77bcf86cd799439022"
      );
      expect(result.isDefault).toBe(true);
    });
  });

  describe("deleteAddress & Deterministic Default Replacement", () => {
    it("should promote latest active address to default when default address is deleted", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockAddress1); // isDefault: true
      vi.mocked(mockRepo.softDelete).mockResolvedValue(true);
      vi.mocked(mockRepo.findLatestActive).mockResolvedValue(mockAddress2);
      vi.mocked(mockRepo.setDefault).mockResolvedValue({
        ...mockAddress2,
        isDefault: true,
      });

      const result = await service.deleteAddress(customerId, "507f1f77bcf86cd799439021");

      expect(mockRepo.softDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439021", customerId);
      expect(mockRepo.findLatestActive).toHaveBeenCalledWith(customerId, "507f1f77bcf86cd799439021");
      expect(mockRepo.setDefault).toHaveBeenCalledWith(customerId, "507f1f77bcf86cd799439022");
      expect(result.deleted).toBe(true);
      expect(result.newDefaultAddressId).toBe("507f1f77bcf86cd799439022");
    });

    it("should not promote replacement if deleted address was not default", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockAddress2); // isDefault: false
      vi.mocked(mockRepo.softDelete).mockResolvedValue(true);

      const result = await service.deleteAddress(customerId, "507f1f77bcf86cd799439022");

      expect(mockRepo.softDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439022", customerId);
      expect(mockRepo.findLatestActive).not.toHaveBeenCalled();
      expect(result.deleted).toBe(true);
      expect(result.newDefaultAddressId).toBeUndefined();
    });

    it("should prevent Customer B from deleting Customer A address", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockAddress1);

      await expect(
        service.deleteAddress(otherCustomerId, "507f1f77bcf86cd799439021")
      ).rejects.toThrow(AddressNotOwnedError);
    });
  });

  describe("Checkout Contract Preparation", () => {
    it("should generate clean CheckoutAddressReference DTO", () => {
      const ref = service.toCheckoutReference(mockAddress1);

      expect(ref.addressId).toBe("507f1f77bcf86cd799439021");
      expect(ref.fullName).toBe("Aria Sharma");
      expect(ref.formattedAddress).toContain("123 Marine Drive");
      expect(ref.formattedAddress).toContain("Mumbai, Maharashtra - 400020");
      expect(ref.country).toBe("India");
    });
  });
});
