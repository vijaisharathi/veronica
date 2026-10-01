import { describe, it, expect } from "vitest";
import { templateRegistry } from "@/modules/notifications/templates/template-registry";
import { escapeHtml } from "@/modules/notifications/templates/email-layout";
import { resendEmailProvider } from "@/modules/notifications/providers/resend-email.provider";
import { inAppChannelHandler } from "@/modules/notifications/channels/in-app.channel";
import { smsChannelHandler } from "@/modules/notifications/channels/sms.channel";
import { pushChannelHandler } from "@/modules/notifications/channels/push.channel";
import { NotificationChannel, NotificationDeliveryStatus, NotificationPriority } from "@/constants/status";
import { DeliveryPlan } from "@/modules/notifications/types/notification.types";

describe("Phase 25 — Notification Templates & Provider Channels", () => {
  describe("XSS Prevention & HTML Sanitization", () => {
    it("escapes dangerous HTML characters safely", () => {
      const malicious = `<script>alert('xss');</script>&"test"'`;
      const escaped = escapeHtml(malicious);

      expect(escaped).not.toContain("<script>");
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&amp;");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&#039;");
    });
  });

  describe("Template Registry Deterministic Rendering", () => {
    it("renders 'order.confirmed' template with escaped customer name and total", () => {
      const rendered = templateRegistry.renderTemplate("order.confirmed", {
        orderNumber: "ORD-90210",
        customerName: "<img src=x onerror=alert(1)> Eleanor Vance",
        totalMinor: 145000,
        itemCount: 2,
      });

      expect(rendered.subject).toContain("Order Confirmed — #ORD-90210");
      expect(rendered.html).toContain("ORD-90210");
      expect(rendered.html).not.toContain("<img src=x");
      expect(rendered.html).toContain("&lt;img src=x");
      expect(rendered.text).toContain("ORD-90210");
      expect(rendered.text).toContain("Eleanor Vance");
      expect(rendered.version).toBe("v1.0.0");
    });

    it("renders 'order.shipped' template with tracking carrier and waybill", () => {
      const rendered = templateRegistry.renderTemplate("order.shipped", {
        orderNumber: "ORD-5544",
        customerName: "Julian Moreau",
        carrier: "DHL Express",
        trackingNumber: "WAYBILL-998877",
        trackingUrl: "/account/orders/ORD-5544/tracking",
      });

      expect(rendered.subject).toContain("Your Order Has Shipped — #ORD-5544");
      expect(rendered.html).toContain("DHL Express");
      expect(rendered.html).toContain("WAYBILL-998877");
      expect(rendered.text).toContain("WAYBILL-998877");
    });

    it("renders 'order.delivered' template with luxury fitting prompt", () => {
      const rendered = templateRegistry.renderTemplate("order.delivered", {
        orderNumber: "ORD-7711",
        customerName: "Camille Claudel",
      });

      expect(rendered.subject).toContain("Delivered — Order #ORD-7711");
      expect(rendered.html).toContain("completed your fitting");
      expect(rendered.text).toContain("experience the fitting");
    });

    it("renders 'order.cancelled' template with reason", () => {
      const rendered = templateRegistry.renderTemplate("order.cancelled", {
        orderNumber: "ORD-9900",
        customerName: "Arthur Dent",
        reason: "Out of bespoke fabric stock",
      });

      expect(rendered.subject).toContain("Order Cancelled — #ORD-9900");
      expect(rendered.html).toContain("Out of bespoke fabric stock");
    });

    it("renders 'payment.completed' and 'payment.failed' templates", () => {
      const completed = templateRegistry.renderTemplate("payment.completed", {
        orderNumber: "ORD-1234",
        customerName: "Beatrice",
        amountMinor: 89000,
      });
      expect(completed.subject).toContain("Payment Confirmed — Order #ORD-1234");

      const failed = templateRegistry.renderTemplate("payment.failed", {
        orderNumber: "ORD-1234",
        customerName: "Beatrice",
        reason: "Card 3DS verification failed",
      });
      expect(failed.subject).toContain("Payment Action Required — Order #ORD-1234");
      expect(failed.html).toContain("Card 3DS verification failed");
    });

    it("renders 'refund.completed' template with formatted refund amount", () => {
      const rendered = templateRegistry.renderTemplate("refund.completed", {
        refundNumber: "REF-4433",
        orderNumber: "ORD-1234",
        customerName: "Lord Byron",
        amountMinor: 50000,
      });

      expect(rendered.subject).toContain("Refund Processed — #REF-4433");
      expect(rendered.html).toContain("REF-4433");
    });

    it("renders 'return.approved' and 'return.rejected' templates", () => {
      const approved = templateRegistry.renderTemplate("return.approved", {
        returnNumber: "RET-101",
        customerName: "Sophie",
      });
      expect(approved.subject).toContain("Return Approved — #RET-101");

      const rejected = templateRegistry.renderTemplate("return.rejected", {
        returnNumber: "RET-102",
        customerName: "Sophie",
        reason: "Garment security tag removed",
      });
      expect(rejected.subject).toContain("Return Request Update — #RET-102");
      expect(rejected.html).toContain("Garment security tag removed");
    });

    it("renders 'review.published' template", () => {
      const rendered = templateRegistry.renderTemplate("review.published", {
        productName: "Cashmere Overcoat",
        productId: "prod_overcoat_1",
        customerName: "Gaston",
      });

      expect(rendered.subject).toContain("Your Review is Live: Cashmere Overcoat");
      expect(rendered.html).toContain("Cashmere Overcoat");
    });

    it("renders 'account.security' template with high priority warnings", () => {
      const rendered = templateRegistry.renderTemplate("account.security", {
        customerName: "Alistair",
        activityDescription: "Password successfully changed from a new device",
      });

      expect(rendered.subject).toContain("Security Alert: VÉRONA Account Activity");
      expect(rendered.html).toContain("Password successfully changed from a new device");
    });
  });

  describe("Resend Email Provider Simulation & Headers", () => {
    it("simulates email delivery in test environment without network errors", async () => {
      const result = await resendEmailProvider.sendEmail({
        to: "client@verona-test.com",
        subject: "Atelier Test Notice",
        html: "<p>Test</p>",
        text: "Test",
        idempotencyKey: "test_key_001",
      });

      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBeDefined();
      expect(result.providerMessageId).toContain("resend_sim_");
    });

    it("verifies webhook signature safely when secret is unconfigured in test", () => {
      const headers = new Headers();
      headers.set("svix-id", "msg_test_123");
      headers.set("svix-timestamp", Math.floor(Date.now() / 1000).toString());
      headers.set("svix-signature", "v1,signature");

      const isValid = resendEmailProvider.verifyWebhookSignature("{}", headers);
      expect(isValid).toBe(true);
    });
  });

  describe("Channel Handlers Interface Conformance", () => {
    const dummyPlan: DeliveryPlan = {
      notificationId: "notif_999",
      eventId: "event_999",
      recipient: {
        customerId: "cust_999",
        email: "clara@verona.com",
        phone: "+919876543210",
        name: "Clara",
        displayName: "Clara",
      },
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP],
      templateKey: "order.confirmed",
      templateData: { orderNumber: "ORD-999" },
    };

    it("inAppChannelHandler returns DELIVERED immediately", async () => {
      const result = await inAppChannelHandler.send(dummyPlan);
      expect(result.channel).toBe(NotificationChannel.IN_APP);
      expect(result.status).toBe(NotificationDeliveryStatus.DELIVERED);
      expect(result.provider).toBe("INTERNAL_DATABASE");
    });

    it("smsChannelHandler operates with provider abstraction", async () => {
      const result = await smsChannelHandler.send(dummyPlan);
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(result.status).toBe(NotificationDeliveryStatus.SENT);
      expect(result.providerMessageId).toBeDefined();
    });

    it("pushChannelHandler operates with provider abstraction", async () => {
      const result = await pushChannelHandler.send(dummyPlan);
      expect(result.channel).toBe(NotificationChannel.PUSH);
      expect(result.status).toBe(NotificationDeliveryStatus.SENT);
      expect(result.providerMessageId).toBeDefined();
    });
  });
});
