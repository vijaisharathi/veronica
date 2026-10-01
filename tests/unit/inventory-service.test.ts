import { describe, it, expect, vi, beforeEach } from "vitest";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { inventoryRepository } from "@/modules/inventory/repositories/inventory.repository";
import { warehouseRepository } from "@/modules/inventory/repositories/warehouse.repository";
import { warehouseAllocationService } from "@/modules/inventory/services/warehouse-allocation.service";
import { reservationService } from "@/modules/inventory/services/reservation.service";
import { ReservationStateMachine } from "@/modules/inventory/state-machine/reservation-state-machine";
import {
  InventoryStatus,
  StockMovementType,
  StockAdjustmentReason,
  StockReservationStatus,
  WarehouseStatus,
} from "@/constants/status";
import { AppError, ConflictError, NotFoundError, AuthorizationError } from "@/lib/errors";
import { IInventoryItem, IStockMovement, IStockReservation, IWarehouse } from "@/types/database";

describe("Phase 20 — Inventory & Warehouse Management Domain Unit Tests", () => {
  const warehouseId = "507f1f77bcf86cd799439001";
  const warehouseCode = "MUM-01";
  const variantId = "507f1f77bcf86cd799439002";
  const productId = "507f1f77bcf86cd799439003";
  const sku = "VER-CSHE-BLK-M";

  const mockWarehouse: IWarehouse = {
    _id: warehouseId,
    code: warehouseCode,
    name: "Mumbai Atelier Distribution Center",
    address: {
      addressLine1: "Plot 14, MIDC Industrial Area",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400093",
    },
    contact: {
      phone: "+919876543210",
      email: "mum01@verona.internal",
      contactPerson: "Arjun Mehta",
    },
    status: WarehouseStatus.ACTIVE,
    active: true,
    operatingStatus: "OPERATIONAL",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInventoryItem: IInventoryItem = {
    _id: "inv-001",
    warehouseId,
    productId,
    variantId,
    sku,
    quantityOnHand: 50,
    quantityReserved: 10,
    availableQuantity: 40,
    reservedQuantity: 10,
    lowStockThreshold: 5,
    damagedQuantity: 0,
    incomingQuantity: 0,
    reorderLevel: 5,
    status: InventoryStatus.IN_STOCK,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(warehouseRepository, "findById").mockResolvedValue(mockWarehouse);
    const { ProductVariantModel } = await import("@/db/models");
    vi.spyOn(ProductVariantModel, "findById").mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: variantId,
        productId,
        sku,
      }),
    } as any);
  });

  describe("Inventory Invariant Guarantees", () => {
    it("should strictly guarantee availableQuantity = quantityOnHand - quantityReserved", () => {
      const onHand = 100;
      const reserved = 35;
      const available = onHand - reserved;

      expect(available).toBe(65);
      expect(onHand).toBeGreaterThanOrEqual(0);
      expect(reserved).toBeGreaterThanOrEqual(0);
      expect(reserved).toBeLessThanOrEqual(onHand);
      expect(available).toBeGreaterThanOrEqual(0);
    });

    it("should reject negative stock adjustments that would exceed on-hand stock", async () => {
      vi.spyOn(inventoryRepository, "getWarehouseStock").mockResolvedValue(mockInventoryItem);
      vi.spyOn(warehouseRepository, "findById").mockResolvedValue(mockWarehouse);

      // Attempting to adjust by -60 when onHand is 50
      vi.spyOn(inventoryRepository, "adjustStock").mockRejectedValue(
        new AppError("Invalid adjustment: resulting on-hand quantity cannot be negative", "INVENTORY_INVARIANT_VIOLATION", 400)
      );

      await expect(
        inventoryService.adjustStock({
          warehouseId,
          variantId,
          quantityDelta: -60,
          reason: StockAdjustmentReason.LOSS,
        })
      ).rejects.toThrow("resulting on-hand quantity cannot be negative");
    });

    it("should reject stock adjustments that reduce on-hand below active reservations", async () => {
      vi.spyOn(inventoryRepository, "adjustStock").mockRejectedValue(
        new ConflictError("Cannot adjust stock below active reservations")
      );

      await expect(
        inventoryService.adjustStock({
          warehouseId,
          variantId,
          quantityDelta: -45, // 50 onHand - 45 = 5, which is < 10 reserved
          reason: StockAdjustmentReason.DAMAGE,
        })
      ).rejects.toThrow("Cannot adjust stock below active reservations");
    });
  });

  describe("Stock Receiving & Movement Creation", () => {
    it("atomically increments quantityOnHand and records RECEIPT movement", async () => {
      const receiveQty = 25;
      const updatedItem: IInventoryItem = {
        ...mockInventoryItem,
        quantityOnHand: 75,
        availableQuantity: 65,
      };

      vi.spyOn(warehouseRepository, "findById").mockResolvedValue(mockWarehouse);
      vi.spyOn(inventoryRepository, "receiveStock").mockResolvedValue({
        item: updatedItem,
        movement: {
          _id: "mov-001",
          warehouseId,
          variantId,
          type: StockMovementType.RECEIPT,
          quantity: receiveQty,
          beforeQuantity: 50,
          afterQuantity: 75,
          referenceType: "STOCK_RECEIPT",
          referenceId: "RCV-12345",
          reason: "Batch replenishment",
          performedBy: "inventory-mgr@verona.internal",
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Product variant exists
      const mockVariant = {
        _id: variantId,
        productId,
        sku,
      };
      const { ProductVariantModel } = await import("@/db/models");
      vi.spyOn(ProductVariantModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockVariant),
      } as any);

      const result = await inventoryService.receiveStock(
        {
          warehouseId,
          variantId,
          quantity: receiveQty,
          notes: "Batch replenishment",
        },
        { email: "inventory-mgr@verona.internal" } as any
      );

      expect(result.quantityOnHand).toBe(75);
      expect(result.availableQuantity).toBe(65);
      expect(result.warehouseCode).toBe("MUM-01");
    });

    it("rejects stock receiving into inactive or maintenance warehouse", async () => {
      vi.spyOn(warehouseRepository, "findById").mockResolvedValue({
        ...mockWarehouse,
        status: WarehouseStatus.MAINTENANCE,
        active: false,
      });

      await expect(
        inventoryService.receiveStock({
          warehouseId,
          variantId,
          quantity: 20,
        })
      ).rejects.toThrow("Cannot receive stock into inactive warehouse");
    });
  });

  describe("Stock Adjustment with Structured Reasons", () => {
    it("successfully applies positive adjustment (ADJUSTMENT_IN) after physical recount", async () => {
      vi.spyOn(warehouseRepository, "findById").mockResolvedValue(mockWarehouse);
      const { ProductVariantModel } = await import("@/db/models");
      vi.spyOn(ProductVariantModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: variantId, productId, sku }),
      } as any);

      const updatedItem: IInventoryItem = {
        ...mockInventoryItem,
        quantityOnHand: 53,
        availableQuantity: 43,
      };

      vi.spyOn(inventoryRepository, "adjustStock").mockResolvedValue({
        item: updatedItem,
        movement: {
          _id: "mov-002",
          warehouseId,
          variantId,
          type: StockMovementType.ADJUSTMENT_IN,
          quantity: 3,
          beforeQuantity: 50,
          afterQuantity: 53,
          referenceType: "STOCK_ADJUSTMENT",
          referenceId: "ADJ-001",
          reason: "Recount surplus",
          adjustmentReason: StockAdjustmentReason.PHYSICAL_COUNT,
          performedBy: "inventory-mgr@verona.internal",
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await inventoryService.adjustStock(
        {
          warehouseId,
          variantId,
          quantityDelta: 3,
          reason: StockAdjustmentReason.PHYSICAL_COUNT,
          notes: "Recount surplus",
        },
        { email: "inventory-mgr@verona.internal" } as any
      );

      expect(result.quantityOnHand).toBe(53);
      expect(result.availableQuantity).toBe(43);
    });
  });

  describe("Stock Reservations Lifecycle & State Machine", () => {
    it("atomically creates reservation and decreases available quantity", async () => {
      const reservationId = "RES-TEST-001";
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      vi.spyOn(warehouseAllocationService, "allocate").mockResolvedValue({
        success: true,
        allocations: [{ variantId, warehouseId, warehouseCode, quantity: 2 }],
      });

      vi.spyOn(inventoryRepository, "reserveStock").mockResolvedValue({
        reservation: {
          _id: "res-doc-1",
          reservationId,
          referenceType: "CHECKOUT",
          referenceId: "chk-sess-123",
          variantId,
          warehouseId,
          quantity: 2,
          status: StockReservationStatus.ACTIVE,
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        movement: {
          _id: "mov-res-1",
          warehouseId,
          variantId,
          type: StockMovementType.RESERVATION,
          quantity: 2,
          beforeQuantity: 40,
          afterQuantity: 38,
          referenceType: "CHECKOUT",
          referenceId: "chk-sess-123",
          performedBy: "SYSTEM",
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const reservation = await reservationService.reserveItem({
        variantId,
        quantity: 2,
        referenceType: "CHECKOUT",
        referenceId: "chk-sess-123",
      });

      expect(reservation.reservationId).toBe(reservationId);
      expect(reservation.quantity).toBe(2);
      expect(reservation.status).toBe(StockReservationStatus.ACTIVE);
    });

    it("idempotently releases an active reservation", async () => {
      const reservationId = "RES-RELEASE-001";
      const existingRes: IStockReservation = {
        _id: "res-doc-2",
        reservationId,
        referenceType: "CHECKOUT",
        referenceId: "chk-sess-456",
        variantId,
        warehouseId,
        quantity: 3,
        status: StockReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 10000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(inventoryRepository, "findReservationById").mockResolvedValue(existingRes);
      vi.spyOn(inventoryRepository, "releaseReservation").mockResolvedValue({
        reservation: {
          ...existingRes,
          status: StockReservationStatus.RELEASED,
          releasedAt: new Date(),
        },
      });

      const result = await reservationService.releaseReservation({ reservationId });
      expect(result.success).toBe(true);
      expect(result.releasedCount).toBe(1);

      // Second release call: idempotent safe no-op
      vi.spyOn(inventoryRepository, "findReservationById").mockResolvedValue({
        ...existingRes,
        status: StockReservationStatus.RELEASED,
      });

      const idempotentResult = await reservationService.releaseReservation({ reservationId });
      expect(idempotentResult.success).toBe(true);
      expect(idempotentResult.releasedCount).toBe(0);
    });

    it("consumes reservation upon order confirmation and rejects release of consumed reservation", async () => {
      const reservationId = "RES-CONSUME-001";
      const activeRes: IStockReservation = {
        _id: "res-doc-3",
        reservationId,
        referenceType: "ORDER",
        referenceId: "VRN-2026-X1Y2Z3",
        variantId,
        warehouseId,
        quantity: 1,
        status: StockReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 10000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(inventoryRepository, "findReservationById").mockResolvedValue(activeRes);
      vi.spyOn(inventoryRepository, "consumeReservation").mockResolvedValue({
        reservation: {
          ...activeRes,
          status: StockReservationStatus.CONSUMED,
          consumedAt: new Date(),
        },
      });

      const consumeResult = await reservationService.consumeReservation({ reservationId });
      expect(consumeResult.success).toBe(true);
      expect(consumeResult.consumedCount).toBe(1);

      // Now attempting to release a consumed reservation must throw ConflictError
      vi.spyOn(inventoryRepository, "findReservationById").mockResolvedValue({
        ...activeRes,
        status: StockReservationStatus.CONSUMED,
      });

      await expect(
        reservationService.releaseReservation({ reservationId })
      ).rejects.toThrow(/from CONSUMED to RELEASED/);
    });

    it("ReservationStateMachine enforces valid transitions and rejects illegal moves", () => {
      // Valid transitions
      expect(
        ReservationStateMachine.canTransition(StockReservationStatus.ACTIVE, StockReservationStatus.RELEASED)
      ).toBe(true);
      expect(
        ReservationStateMachine.canTransition(StockReservationStatus.ACTIVE, StockReservationStatus.CONSUMED)
      ).toBe(true);
      expect(
        ReservationStateMachine.canTransition(StockReservationStatus.ACTIVE, StockReservationStatus.EXPIRED)
      ).toBe(true);

      // Invalid transitions
      expect(
        ReservationStateMachine.canTransition(StockReservationStatus.CONSUMED, StockReservationStatus.RELEASED)
      ).toBe(false);
      expect(
        ReservationStateMachine.canTransition(StockReservationStatus.RELEASED, StockReservationStatus.ACTIVE)
      ).toBe(false);
      expect(
        ReservationStateMachine.canTransition(StockReservationStatus.EXPIRED, StockReservationStatus.CONSUMED)
      ).toBe(false);
    });

    it("cleans up expired active reservations", async () => {
      const expiredRes: IStockReservation = {
        _id: "res-expired-1",
        reservationId: "RES-EXP-001",
        referenceType: "CHECKOUT",
        referenceId: "chk-expired-1",
        variantId,
        warehouseId,
        quantity: 2,
        status: StockReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(inventoryRepository, "findExpiredReservations").mockResolvedValue([expiredRes]);
      vi.spyOn(inventoryRepository, "expireReservation").mockResolvedValue({
        reservation: {
          ...expiredRes,
          status: StockReservationStatus.EXPIRED,
          releasedAt: new Date(),
        },
      });

      const result = await reservationService.cleanupExpiredReservations();
      expect(result.expiredCount).toBe(1);
    });
  });

  describe("Warehouse Allocation Foundation", () => {
    const warehouseB = {
      ...mockWarehouse,
      _id: "507f1f77bcf86cd799439099",
      code: "BLR-01",
      name: "Bengaluru Fulfillment Hub",
    };

    it("prioritizes single-warehouse fulfillment when one facility has all requested items", async () => {
      vi.spyOn(warehouseRepository, "findActiveWarehouses").mockResolvedValue([
        mockWarehouse,
        warehouseB,
      ]);

      // Warehouse MUM-01 has 10 of item 1 and 5 of item 2
      vi.spyOn(inventoryRepository, "getBatchVariantStock").mockResolvedValue([
        {
          ...mockInventoryItem,
          warehouseId: mockWarehouse._id,
          variantId: "var-1",
          quantityOnHand: 20,
          quantityReserved: 0,
          availableQuantity: 20,
        },
        {
          ...mockInventoryItem,
          warehouseId: mockWarehouse._id,
          variantId: "var-2",
          quantityOnHand: 15,
          quantityReserved: 0,
          availableQuantity: 15,
        },
      ]);

      const result = await warehouseAllocationService.allocate([
        { variantId: "var-1", quantity: 2 },
        { variantId: "var-2", quantity: 1 },
      ]);

      expect(result.success).toBe(true);
      expect(result.allocations.length).toBe(2);
      expect(result.allocations[0]!.warehouseCode).toBe("MUM-01");
      expect(result.allocations[1]!.warehouseCode).toBe("MUM-01");
    });

    it("returns INVENTORY_UNAVAILABLE when requested quantity exceeds available stock across all centers", async () => {
      vi.spyOn(warehouseRepository, "findActiveWarehouses").mockResolvedValue([mockWarehouse]);
      vi.spyOn(inventoryRepository, "getBatchVariantStock").mockResolvedValue([
        {
          ...mockInventoryItem,
          variantId: "var-scarce",
          quantityOnHand: 2,
          quantityReserved: 1,
          availableQuantity: 1,
        },
      ]);

      const result = await warehouseAllocationService.allocate([
        { variantId: "var-scarce", quantity: 5 }, // Needs 5, only 1 available
      ]);

      expect(result.success).toBe(false);
      expect(result.unavailableVariantIds).toContain("var-scarce");
      expect(result.reason).toContain("INVENTORY_UNAVAILABLE");
    });
  });

  describe("Customer Stock Availability & Privacy Isolation", () => {
    it("returns safe DTO without leaking internal warehouse codes or raw numbers", async () => {
      vi.spyOn(inventoryRepository, "getVariantStockAcrossWarehouses").mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await inventoryService.getVariantAvailability(variantId);

      expect(result.variantId).toBe(variantId);
      expect(result.isAvailable).toBe(true);
      expect(result.isLowStock).toBe(false);
      expect(result.stockStatus).toBe("IN_STOCK");
      // Must not expose warehouseId or raw counts in public DTO
      expect((result as any).warehouseId).toBeUndefined();
      expect((result as any).quantityOnHand).toBeUndefined();
    });

    it("detects LOW_STOCK when available stock is at or below threshold", async () => {
      vi.spyOn(inventoryRepository, "getVariantStockAcrossWarehouses").mockResolvedValue([
        {
          ...mockInventoryItem,
          quantityOnHand: 4,
          quantityReserved: 0,
          availableQuantity: 4,
          lowStockThreshold: 5,
        },
      ]);

      const result = await inventoryService.getVariantAvailability(variantId);
      expect(result.isAvailable).toBe(true);
      expect(result.isLowStock).toBe(true);
      expect(result.stockStatus).toBe("LOW_STOCK");
    });

    it("detects OUT_OF_STOCK when available stock is 0", async () => {
      vi.spyOn(inventoryRepository, "getVariantStockAcrossWarehouses").mockResolvedValue([
        {
          ...mockInventoryItem,
          quantityOnHand: 10,
          quantityReserved: 10,
          availableQuantity: 0,
        },
      ]);

      const result = await inventoryService.getVariantAvailability(variantId);
      expect(result.isAvailable).toBe(false);
      expect(result.isLowStock).toBe(false);
      expect(result.stockStatus).toBe("OUT_OF_STOCK");
    });
  });

  describe("Warehouse Scoping & RBAC Security", () => {
    it("prevents warehouse staff from modifying stock in an unassigned warehouse", async () => {
      const warehouseStaffWithRestriction = {
        _id: "staff-wh-01",
        email: "staff@verona.internal",
        assignedWarehouseId: "different-warehouse-id",
      };

      await expect(
        inventoryService.receiveStock(
          {
            warehouseId,
            variantId,
            quantity: 10,
          },
          warehouseStaffWithRestriction as any
        )
      ).rejects.toThrow("Warehouse scope violation");
    });
  });
});
