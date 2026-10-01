import { describe, it, expect, vi, beforeEach } from "vitest";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { fulfillmentRepository } from "@/modules/fulfillment/repositories/fulfillment.repository";
import { FulfillmentStatus } from "@/constants/status";
import { AuthorizationError, ConflictError, ValidationError } from "@/lib/errors";
import { IStaff } from "@/types/database";

describe("Phase 21 — Fulfillment Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Warehouse Scoping Authorization", () => {
    it("allows staff with matching assigned warehouse", () => {
      const staff: Partial<IStaff> = {
        _id: "staff-1" as any,
        email: "staff1@verona.com",
        assignedWarehouseId: "warehouse-123" as any,
      };

      expect(() =>
        fulfillmentService.assertWarehouseScope("warehouse-123", staff as IStaff)
      ).not.toThrow();
    });

    it("throws AuthorizationError if staff attempts to access another warehouse", () => {
      const staff: Partial<IStaff> = {
        _id: "staff-1" as any,
        email: "staff1@verona.com",
        assignedWarehouseId: "warehouse-123" as any,
      };

      expect(() =>
        fulfillmentService.assertWarehouseScope("warehouse-999", staff as IStaff)
      ).toThrow(AuthorizationError);
    });

    it("allows staff with no warehouse restriction (headquarters / superadmin)", () => {
      const staff: Partial<IStaff> = {
        _id: "admin-1" as any,
        email: "admin@verona.com",
        assignedWarehouseId: undefined,
      };

      expect(() =>
        fulfillmentService.assertWarehouseScope("warehouse-999", staff as IStaff)
      ).not.toThrow();
    });
  });

  describe("Fulfillment Cancellation Rules", () => {
    it("throws ConflictError if fulfillment is in non-cancellable state (e.g. PACKING, PACKED)", async () => {
      vi.spyOn(fulfillmentRepository, "findFulfillmentById").mockResolvedValueOnce({
        _id: "f-1" as any,
        fulfillmentNumber: "FUL-TEST-01",
        orderId: "order-1",
        warehouseId: "wh-1",
        status: FulfillmentStatus.PACKED,
        items: [],
      } as any);

      await expect(
        fulfillmentService.cancelFulfillment("f-1", "Customer requested cancellation")
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Pick Operations Validation", () => {
    it("rejects over-picking when picked quantity exceeds ordered quantity", async () => {
      vi.spyOn(fulfillmentRepository, "findFulfillmentById").mockResolvedValueOnce({
        _id: "f-1" as any,
        fulfillmentNumber: "FUL-TEST-01",
        orderId: "order-1",
        warehouseId: "wh-1",
        status: FulfillmentStatus.PICKING,
        items: [
          {
            orderItemId: "item-1",
            productId: "prod-1",
            variantId: "var-1",
            sku: "VER-COAT-01-M",
            productName: "Cashmere Overcoat",
            color: "Camel",
            size: "M",
            orderedQuantity: 2,
            fulfilledQuantity: 0,
          },
        ],
      } as any);

      await expect(
        fulfillmentService.confirmPick({
          fulfillmentId: "f-1",
          pickedItems: [{ orderItemId: "item-1", quantity: 5 }], // Attempting to pick 5 when only 2 ordered
          actor: "warehouse@verona.com",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Package Creation Validation", () => {
    it("rejects package creation if fulfillment is not in PICKED or PACKING status", async () => {
      vi.spyOn(fulfillmentRepository, "findFulfillmentById").mockResolvedValueOnce({
        _id: "f-1" as any,
        fulfillmentNumber: "FUL-TEST-01",
        orderId: "order-1",
        warehouseId: "wh-1",
        status: FulfillmentStatus.ALLOCATED, // Not yet picked or packing
        items: [],
      } as any);

      await expect(
        fulfillmentService.createPackage({
          fulfillmentId: "f-1",
          items: [{ orderItemId: "item-1", variantId: "var-1", sku: "SKU-1", quantity: 1 }],
          weightGrams: 500,
          actor: "staff@verona.com",
        })
      ).rejects.toThrow(ConflictError);
    });
  });
});
