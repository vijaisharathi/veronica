import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as handleRazorpayWebhook } from "@/app/api/webhooks/razorpay/route";
import { paymentService } from "@/modules/payments";
import { ValidationError } from "@/lib/errors";

describe("Phase 18 — Razorpay Webhook Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/webhooks/razorpay", () => {
    it("returns 400 when x-razorpay-signature header is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        body: JSON.stringify({ event: "payment.captured" }),
      });

      const res = await handleRazorpayWebhook(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Missing x-razorpay-signature header");
    });

    it("returns 400 when signature verification fails", async () => {
      vi.spyOn(paymentService, "processWebhook").mockRejectedValueOnce(
        new ValidationError("Invalid webhook signature")
      );

      const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": "tampered_signature_hex",
        },
        body: JSON.stringify({ event: "payment.captured" }),
      });

      const res = await handleRazorpayWebhook(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Invalid webhook signature");
    });

    it("returns 200 with PROCESSED when event is valid", async () => {
      vi.spyOn(paymentService, "processWebhook").mockResolvedValueOnce({
        status: "PROCESSED",
        handled: true,
        eventId: "evt_12345",
      });

      const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": "valid_signature_hex",
        },
        body: JSON.stringify({ id: "evt_12345", event: "payment.captured" }),
      });

      const res = await handleRazorpayWebhook(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("PROCESSED");
    });

    it("returns 200 with DUPLICATE when event was already processed (idempotency)", async () => {
      vi.spyOn(paymentService, "processWebhook").mockResolvedValueOnce({
        status: "DUPLICATE",
        handled: true,
        eventId: "evt_12345",
      });

      const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": "valid_signature_hex",
        },
        body: JSON.stringify({ id: "evt_12345", event: "payment.captured" }),
      });

      const res = await handleRazorpayWebhook(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("DUPLICATE");
    });
  });
});
