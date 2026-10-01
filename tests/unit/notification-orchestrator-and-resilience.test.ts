import { describe, it, expect, vi, beforeEach } from "vitest";
import { EVENT_CATALOG_CONFIG } from "@/modules/notifications/events/event-catalog";
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@/constants/status";
import { NotificationOrchestrator } from "@/modules/notifications/orchestrator/notification-orchestrator";
import { NotificationDeliveryService } from "@/modules/notifications/delivery/notification-delivery.service";

describe("Phase 25 — Event Catalog, Orchestrator & Failure Isolation", () => {
  describe("Event Catalog Invariants", () => {
    const requiredEventTypes = [
      "order.confirmed",
      "order.shipped",
      "order.delivered",
      "order.cancelled",
      "payment.completed",
      "payment.failed",
      "refund.completed",
      "return.approved",
      "return.rejected",
      "review.published",
      "account.security",
    ];

    it("has complete configuration for every required event type", () => {
      for (const eventType of requiredEventTypes) {
        const config = EVENT_CATALOG_CONFIG[eventType];
        expect(config).toBeDefined();
        if (!config) continue;

        expect(config.notificationType).toBeDefined();
        expect(config.category).toBeDefined();
        expect(config.priority).toBeDefined();
        expect(config.defaultChannels.length).toBeGreaterThan(0);
        expect(config.templateKey).toBeDefined();

        // Validate title and message generators return valid non-empty strings
        const dummyEvent = {
          orderNumber: "ORD-111",
          refundNumber: "REF-222",
          returnNumber: "RET-333",
          productName: "Silk Shirt",
          activityDescription: "New login",
        };
        const title = config.generateTitle(dummyEvent);
        const message = config.generateMessage(dummyEvent);
        expect(typeof title).toBe("string");
        expect(title.length).toBeGreaterThan(3);
        expect(typeof message).toBe("string");
        expect(message.length).toBeGreaterThan(5);
      }
    });

    it("configures critical security and payment failure events with CRITICAL priority", () => {
      expect(EVENT_CATALOG_CONFIG["account.security"]?.priority).toBe(NotificationPriority.CRITICAL);
      expect(EVENT_CATALOG_CONFIG["payment.failed"]?.priority).toBe(NotificationPriority.CRITICAL);
    });

    it("ensures IN_APP channel is present on all catalog events", () => {
      for (const eventType of requiredEventTypes) {
        const config = EVENT_CATALOG_CONFIG[eventType];
        expect(config).toBeDefined();
        expect(config?.defaultChannels).toContain(NotificationChannel.IN_APP);
      }
    });
  });

  describe("Failure Isolation Guarantees", () => {
    it("gracefully returns failure result without throwing on malformed events", async () => {
      const orchestrator = new NotificationOrchestrator();

      // Missing customerId
      const malformedEvent1 = {
        eventId: "evt_1",
        eventType: "order.confirmed",
        customerId: "",
        occurredAt: new Date(),
      };
      const result1 = await orchestrator.processEvent(malformedEvent1 as any);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain("Invalid event");

      // Missing eventId
      const malformedEvent2 = {
        eventId: "",
        eventType: "order.confirmed",
        customerId: "cust_1",
        occurredAt: new Date(),
      };
      const result2 = await orchestrator.processEvent(malformedEvent2 as any);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Invalid event");
    });
  });

  describe("Retry Bounding & Exponential Backoff Rules", () => {
    it("enforces maximum attempts limit in delivery service", () => {
      const deliveryService = new NotificationDeliveryService();
      // Internal max attempts is 3
      expect(deliveryService["maxAttempts"]).toBe(3);
    });
  });
});
