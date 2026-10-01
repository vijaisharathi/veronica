import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getFulfillmentsApi, POST as createFulfillmentApi } from "@/app/api/admin/fulfillment/route";
import { GET as getFulfillmentDetailApi } from "@/app/api/admin/fulfillment/[id]/route";
import { POST as allocateFulfillmentApi } from "@/app/api/admin/fulfillment/[id]/allocate/route";
import { POST as startPickingApi } from "@/app/api/admin/fulfillment/[id]/start-picking/route";
import { POST as confirmPickApi } from "@/app/api/admin/fulfillment/[id]/confirm-pick/route";
import { POST as createPackageApi } from "@/app/api/admin/fulfillment/[id]/packages/route";
import { POST as createShipmentApi } from "@/app/api/admin/fulfillment/[id]/shipments/route";
import { POST as shippingWebhookApi } from "@/app/api/webhooks/shipping/route";
import { GET as getCustomerTrackingApi } from "@/app/api/orders/[orderNumber]/tracking/route";
import * as rbacModule from "@/lib/auth/rbac";
import * as sessionModule from "@/lib/auth/session";
import { fulfillmentService } from "@/modules/fulfillment/services/fulfillment.service";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
import { fulfillmentRepository } from "@/modules/fulfillment/repositories/fulfillment.repository";
import { FulfillmentStatus, ShipmentStatus } from "@/constants/status";
import { IStaff, ICustomer } from "@/types/database";

describe("Phase 21 — Fulfillment & Shipping API Integration Suite", () => {
  const mockStaff: IStaff = {
    _id: "staff-mgr-1" as any,
    email: "fulfillment.lead@verona.internal",
    firstName: "Marcus",
    lastName: "Vance",
    status: "ACTIVE" as any,
    roles: ["role-fulfillment-lead"],
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer: ICustomer = {
    _id: "cust-123" as any,
    authProviderId: "user_clerk_123",
    email: "customer@verona.com",
    firstName: "Elena",
    lastName: "Rostova",
    displayName: "Elena Rostova",
    status: "ACTIVE" as any,
    emailVerified: true,
    phoneVerified: true,
    preferences: {
      marketingEmail: true,
      marketingSms: false,
      marketingWhatsapp: false,
    },
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Admin Fulfillment Endpoints", () => {
    it("GET /api/admin/fulfillment — lists fulfillments with status counts", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      vi.spyOn(fulfillmentService, "listFulfillments").mockResolvedValue({
        items: [
          {
            id: "ful-1",
            fulfillmentNumber: "FUL-TEST-001",
            orderId: "ord-1",
            warehouseId: "wh-1",
            status: FulfillmentStatus.ALLOCATED,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      vi.spyOn(fulfillmentService, "getFulfillmentStats").mockResolvedValue({
        [FulfillmentStatus.ALLOCATED]: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/fulfillment?page=1&limit=20");
      const res = await getFulfillmentsApi(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
      expect(json.data.stats[FulfillmentStatus.ALLOCATED]).toBe(1);
    });

    it("POST /api/admin/fulfillment — creates fulfillment for an order", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      vi.spyOn(fulfillmentService, "createFulfillment").mockResolvedValue({
        id: "ful-2",
        fulfillmentNumber: "FUL-TEST-002",
        orderId: "ord-123",
        warehouseId: "wh-1",
        status: FulfillmentStatus.ALLOCATED,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/fulfillment", {
        method: "POST",
        body: JSON.stringify({ orderId: "ord-123" }),
      });

      const res = await createFulfillmentApi(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.fulfillment.fulfillmentNumber).toBe("FUL-TEST-002");
    });

    it("POST /api/admin/fulfillment/[id]/start-picking — transitions fulfillment to PICKING", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      vi.spyOn(fulfillmentService, "startPicking").mockResolvedValue({
        id: "ful-1",
        fulfillmentNumber: "FUL-001",
        orderId: "ord-1",
        warehouseId: "wh-1",
        status: FulfillmentStatus.PICKING,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/fulfillment/ful-1/start-picking", {
        method: "POST",
      });

      const res = await startPickingApi(req, { params: Promise.resolve({ id: "ful-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.fulfillment.status).toBe(FulfillmentStatus.PICKING);
    });

    it("POST /api/admin/fulfillment/[id]/confirm-pick — validates and confirms picked quantities", async () => {
      vi.spyOn(rbacModule, "requireAnyPermission").mockResolvedValue(mockStaff);
      vi.spyOn(fulfillmentService, "confirmPick").mockResolvedValue({
        id: "ful-1",
        fulfillmentNumber: "FUL-001",
        orderId: "ord-1",
        warehouseId: "wh-1",
        status: FulfillmentStatus.PICKED,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/admin/fulfillment/ful-1/confirm-pick", {
        method: "POST",
        body: JSON.stringify({
          pickedItems: [{ orderItemId: "item-1", quantity: 2 }],
        }),
      });

      const res = await confirmPickApi(req, { params: Promise.resolve({ id: "ful-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.fulfillment.status).toBe(FulfillmentStatus.PICKED);
    });
  });

  describe("Shipping Carrier Webhook Endpoint", () => {
    it("POST /api/webhooks/shipping — processes carrier webhook notification with idempotency", async () => {
      vi.spyOn(shipmentService, "processShippingWebhook").mockResolvedValue({
        success: true,
      });

      const req = new NextRequest("http://localhost:3000/api/webhooks/shipping?provider=MANUAL", {
        method: "POST",
        headers: {
          "x-shipping-signature": "test-signature-123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: "carrier-evt-99",
          status: "in_transit",
          awbNumber: "AWB-TEST-123",
          description: "Parcel left sorting facility",
        }),
      });

      const res = await shippingWebhookApi(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("Customer Order Tracking Endpoint", () => {
    it("GET /api/orders/[orderNumber]/tracking — provides chronological tracking timeline", async () => {
      vi.spyOn(sessionModule, "requireCustomer").mockResolvedValue(mockCustomer);
      vi.spyOn(shipmentService, "getCustomerOrderTracking").mockResolvedValue({
        orderNumber: "VER-2026-0001",
        orderStatus: "SHIPPED",
        shipments: [
          {
            shipmentNumber: "SHP-TEST-01",
            awbNumber: "AWB-987654",
            provider: "MANUAL",
            status: ShipmentStatus.IN_TRANSIT,
            statusLabel: "In Transit",
            items: [{ sku: "VER-COAT-M", productName: "Wool Coat", color: "Camel", size: "M", quantity: 1 }],
            timeline: [
              {
                status: "LABEL_CREATED",
                label: "Order Packed & Label Created",
                isCompleted: true,
                isCurrent: false,
              },
              {
                status: "IN_TRANSIT",
                label: "In Transit",
                isCompleted: true,
                isCurrent: true,
              },
            ],
          },
        ],
      });

      const req = new NextRequest("http://localhost:3000/api/orders/VER-2026-0001/tracking");
      const res = await getCustomerTrackingApi(req, {
        params: Promise.resolve({ orderNumber: "VER-2026-0001" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.orderNumber).toBe("VER-2026-0001");
      expect(json.data.shipments[0].timeline).toHaveLength(2);
    });
  });
});
