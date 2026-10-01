import { describe, it, expect, vi, beforeEach } from "vitest";
import { shipmentService } from "@/modules/fulfillment/services/shipment.service";
import { fulfillmentRepository } from "@/modules/fulfillment/repositories/fulfillment.repository";
import { shippingProviderService } from "@/modules/fulfillment/services/shipping-provider.service";
import { ShipmentStatus, ShipmentEventSource } from "@/constants/status";
import { AppError } from "@/lib/errors";

describe("Phase 21 — Shipment Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Carrier Webhook Ingestion & Idempotency", () => {
    it("rejects webhook if carrier signature is invalid", async () => {
      vi.spyOn(shippingProviderService, "getProvider").mockReturnValueOnce({
        name: "MANUAL",
        capabilities: {} as any,
        createShipment: vi.fn(),
        trackShipment: vi.fn(),
        cancelShipment: vi.fn(),
        verifyWebhookSignature: vi.fn().mockReturnValue(false), // Failed signature check
      });

      const result = await shipmentService.processShippingWebhook(
        "MANUAL",
        "invalid-signature-xyz",
        '{"eventId":"evt-1"}',
        { eventId: "evt-1" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid webhook signature");
    });

    it("returns duplicate: true if webhook event ID was already processed", async () => {
      vi.spyOn(shippingProviderService, "getProvider").mockReturnValueOnce({
        name: "MANUAL",
        capabilities: {} as any,
        createShipment: vi.fn(),
        trackShipment: vi.fn(),
        cancelShipment: vi.fn(),
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
      });

      vi.spyOn(fulfillmentRepository, "findWebhookEvent").mockResolvedValueOnce({
        _id: "wb-1" as any,
        provider: "MANUAL",
        eventId: "evt-existing-123",
        status: "PROCESSED",
      } as any);

      const result = await shipmentService.processShippingWebhook(
        "MANUAL",
        "valid-signature",
        '{"eventId":"evt-existing-123"}',
        { eventId: "evt-existing-123" }
      );

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
    });
  });

  describe("Shipment Event Tracking", () => {
    it("rejects illegal shipment transition from DELIVERED", async () => {
      vi.spyOn(fulfillmentRepository, "findShipmentById").mockResolvedValueOnce({
        _id: "s-1" as any,
        shipmentNumber: "SHP-001",
        orderId: "order-1",
        fulfillmentId: "f-1",
        warehouseId: "wh-1",
        status: ShipmentStatus.DELIVERED,
      } as any);

      await expect(
        shipmentService.recordShipmentEvent("s-1", {
          status: ShipmentStatus.IN_TRANSIT,
          description: "Carrier updated status",
          source: ShipmentEventSource.ADMIN,
        })
      ).rejects.toThrow(AppError);
    });
  });
});
