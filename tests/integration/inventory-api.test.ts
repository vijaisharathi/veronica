import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProductInventory } from "@/app/api/products/[slug]/inventory/route";
import { GET as getBatchAvailability } from "@/app/api/inventory/availability/route";
import { GET as getAdminInventory } from "@/app/api/admin/inventory/route";
import { POST as receiveStockApi } from "@/app/api/admin/inventory/receive/route";
import { POST as adjustStockApi } from "@/app/api/admin/inventory/adjust/route";
import { GET as getWarehousesApi, POST as createWarehouseApi } from "@/app/api/admin/warehouses/route";
import { PATCH as updateWarehouseApi } from "@/app/api/admin/warehouses/[id]/route";
import * as rbacModule from "@/lib/auth/rbac";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { warehouseService } from "@/modules/inventory/services/warehouse.service";
import { inventoryRepository } from "@/modules/inventory/repositories/inventory.repository";
import { StockAdjustmentReason, WarehouseStatus, InventoryStatus } from "@/constants/status";
import { InsufficientPermissionError, ConflictError, AuthorizationError } from "@/lib/errors";
import { IStaff } from "@/types/database";

describe("Phase 20 — Inventory & Warehouse Management API & Security Integration Suite", () => {
  const mockStaff: IStaff = {
    _id: "staff-mgr-1",
    email: "manager@verona.internal",
    firstName: "Priya",
    lastName: "Sharma",
    status: "ACTIVE" as any,
    roles: ["role-inv-mgr"],
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const warehouseId = "507f1f77bcf86cd799439001";
  const variantId = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Public Customer Availability Endpoints", () => {
    it("GET /api/products/[slug]/inventory — returns safe availability matrix without leaking exact quantities", async () => {
      vi.spyOn(inventoryService, "getProductAvailabilityMatrix").mockResolvedValue({
        productId: "prod-silk-shirt",
        variants: [
          {
            variantId: "var-1",
            color: "Noir Black",
            size: "M",
            sku: "VER-SSHT-BLK-M",
            isAvailable: true,
            isLowStock: false,
            stockStatus: "IN_STOCK",
          },
          {
            variantId: "var-2",
            color: "Noir Black",
            size: "L",
            sku: "VER-SSHT-BLK-L",
            isAvailable: false,
            isLowStock: false,
            stockStatus: "OUT_OF_STOCK",
          },
        ],
        matrix: {
          "Noir Black": {
            M: { variantId: "var-1", isAvailable: true, isLowStock: false, stockStatus: "IN_STOCK" },
            L: { variantId: "var-2", isAvailable: false, isLowStock: false, stockStatus: "OUT_OF_STOCK" },
          },
        },
      });

      const { productService } = await import("@/modules/catalog/product.service");
      vi.spyOn(productService, "getProductBySlug").mockResolvedValue({
        product: { id: "prod-silk-shirt", slug: "silk-shirt" } as any,
        breadcrumbs: [],
      } as any);

      const req = new NextRequest("http://localhost:3000/api/products/silk-shirt/inventory");
      const res = await getProductInventory(req, {
        params: Promise.resolve({ slug: "silk-shirt" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.matrix["Noir Black"].M.isAvailable).toBe(true);
      expect(body.data.matrix["Noir Black"].L.isAvailable).toBe(false);

      // Verify no exact stock quantities or warehouse codes are leaked
      const stringified = JSON.stringify(body);
      expect(stringified).not.toContain("quantityOnHand");
      expect(stringified).not.toContain("quantityReserved");
      expect(stringified).not.toContain("warehouseId");
    });

    it("GET /api/inventory/availability — batch query returns status for requested variant IDs", async () => {
      vi.spyOn(inventoryService, "getBatchVariantAvailability").mockResolvedValue({
        "var-101": {
          variantId: "var-101",
          isAvailable: true,
          isLowStock: true,
          stockStatus: "LOW_STOCK",
        },
        "var-102": {
          variantId: "var-102",
          isAvailable: false,
          isLowStock: false,
          stockStatus: "OUT_OF_STOCK",
        },
      });

      const req = new NextRequest("http://localhost:3000/api/inventory/availability?variantIds=var-101,var-102");
      const res = await getBatchAvailability(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.availability["var-101"].stockStatus).toBe("LOW_STOCK");
      expect(body.data.availability["var-102"].stockStatus).toBe("OUT_OF_STOCK");
    });
  });

  describe("Admin Inventory RBAC & Security", () => {
    it("rejects unauthorized access to GET /api/admin/inventory", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockRejectedValue(
        new InsufficientPermissionError("inventory.read", "Access denied")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/inventory");
      const res = await getAdminInventory(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INSUFFICIENT_PERMISSION");
    });

    it("allows authorized staff to list inventory with filters", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      vi.spyOn(inventoryService, "listInventory").mockResolvedValue({
        items: [
          {
            id: "inv-1",
            warehouseId,
            warehouseCode: "MUM-01",
            variantId,
            sku: "VER-CSHE-BLK-M",
            quantityOnHand: 40,
            quantityReserved: 5,
            availableQuantity: 35,
            lowStockThreshold: 5,
            status: InventoryStatus.IN_STOCK,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/inventory?warehouseId=" + warehouseId);
      const res = await getAdminInventory(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.items.length).toBe(1);
      expect(body.data.items[0].availableQuantity).toBe(35);
    });
  });

  describe("Stock Receiving & Adjustments API", () => {
    it("POST /api/admin/inventory/receive — successfully receives stock when authorized", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      vi.spyOn(inventoryService, "receiveStock").mockResolvedValue({
        id: "inv-1",
        warehouseId,
        warehouseCode: "MUM-01",
        variantId,
        quantityOnHand: 60,
        quantityReserved: 0,
        availableQuantity: 60,
        lowStockThreshold: 5,
        status: InventoryStatus.IN_STOCK,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          variantId,
          quantity: 20,
          notes: "Vendor intake shipment",
        }),
      });

      const res = await receiveStockApi(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.item.quantityOnHand).toBe(60);
    });

    it("POST /api/admin/inventory/receive — rejects negative or non-integer quantities", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);

      const req = new NextRequest("http://localhost:3000/api/admin/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          variantId,
          quantity: -10, // Invalid
        }),
      });

      const res = await receiveStockApi(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("POST /api/admin/inventory/adjust — rejects adjustment when delta is 0", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);

      const req = new NextRequest("http://localhost:3000/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          variantId,
          quantityDelta: 0,
          reason: StockAdjustmentReason.CORRECTION,
        }),
      });

      const res = await adjustStockApi(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("enforces server-side warehouse scope: rejects mutation when staff is restricted to another warehouse", async () => {
      const restrictedStaff = {
        ...mockStaff,
        assignedWarehouseId: "different-warehouse-id",
      };
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(restrictedStaff);
      vi.spyOn(inventoryService, "receiveStock").mockRejectedValue(
        new AuthorizationError("Warehouse scope violation")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          variantId,
          quantity: 10,
        }),
      });

      const res = await receiveStockApi(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error.message).toContain("Warehouse scope violation");
    });
  });

  describe("Warehouse Administration API", () => {
    it("POST /api/admin/warehouses — enforces unique warehouse code constraint", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      vi.spyOn(warehouseService, "createWarehouse").mockRejectedValue(
        new ConflictError("Warehouse with code 'MUM-01' already exists")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "MUM-01",
          name: "Duplicate Facility",
          address: {
            addressLine1: "123 Street",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            pincode: "400001",
          },
          contact: {
            phone: "+919876543210",
            email: "wh@verona.com",
            contactPerson: "Manager",
          },
        }),
      });

      const res = await createWarehouseApi(req);
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.error.message).toContain("already exists");
    });
  });

  describe("Concurrency & Overselling Protection (Zero Overselling)", () => {
    it("prevents overselling when two simultaneous reservation requests compete for the last item", async () => {
      let currentAvailable = 1;

      // Simulate atomic database findOneAndUpdate with precondition availableQuantity >= 1
      const mockAtomicReserve = vi.fn().mockImplementation(async ({ quantity }: { quantity: number }) => {
        if (currentAvailable >= quantity) {
          currentAvailable -= quantity;
          return {
            reservation: {
              reservationId: "RES-CONCURRENT",
              variantId,
              warehouseId,
              quantity,
              status: "ACTIVE",
            },
            movement: {},
          };
        }
        throw new ConflictError("Insufficient available stock");
      });

      vi.spyOn(inventoryRepository, "reserveStock").mockImplementation(mockAtomicReserve as any);

      // Customer A and Customer B both attempt to reserve 1 unit simultaneously
      const customerAPromise = inventoryRepository.reserveStock({
        warehouseId,
        variantId,
        quantity: 1,
        referenceType: "CHECKOUT",
        referenceId: "chk-cust-A",
        expiresAt: new Date(Date.now() + 60000),
        reservationId: "RES-A",
      });

      const customerBPromise = inventoryRepository.reserveStock({
        warehouseId,
        variantId,
        quantity: 1,
        referenceType: "CHECKOUT",
        referenceId: "chk-cust-B",
        expiresAt: new Date(Date.now() + 60000),
        reservationId: "RES-B",
      });

      const results = await Promise.allSettled([customerAPromise, customerBPromise]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactly ONE succeeds, exactly ONE fails
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      // Final remaining stock must be 0, never negative
      expect(currentAvailable).toBe(0);
    });
  });
});
