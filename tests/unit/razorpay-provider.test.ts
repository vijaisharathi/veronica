import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { RazorpayPaymentProvider } from "@/modules/payments/providers/razorpay.provider";
import { ValidationError } from "@/lib/errors";

describe("Phase 18 — Razorpay Payment Provider Unit Tests", () => {
  const keyId = "rzp_test_key_12345";
  const keySecret = "rzp_test_secret_67890";
  const webhookSecret = "rzp_webhook_secret_abcde";

  let provider: RazorpayPaymentProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new RazorpayPaymentProvider(keyId, keySecret, webhookSecret);
  });

  describe("getPublicKey", () => {
    it("returns public key ID without revealing secret", () => {
      expect(provider.getPublicKey()).toBe(keyId);
    });
  });

  describe("Payment Signature Verification", () => {
    const orderId = "order_O123456789";
    const paymentId = "pay_P987654321";

    it("verifies valid HMAC SHA-256 signature", async () => {
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

      const result = await provider.verifyPayment({
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        signature: validSignature,
      });

      expect(result.verified).toBe(true);
      expect(result.providerOrderId).toBe(orderId);
      expect(result.providerPaymentId).toBe(paymentId);
    });

    it("rejects invalid or tampered signature", async () => {
      const tamperedSignature = "invalid_signature_hex_value_1234567890abcdef1234567890abcdef";

      const result = await provider.verifyPayment({
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        signature: tamperedSignature,
      });

      expect(result.verified).toBe(false);
      expect(result.reason).toContain("Cryptographic signature verification failed");
    });

    it("rejects missing parameters", async () => {
      const result = await provider.verifyPayment({
        providerOrderId: "",
        providerPaymentId: paymentId,
        signature: "sig",
      });

      expect(result.verified).toBe(false);
    });
  });

  describe("Webhook Signature Verification", () => {
    const rawPayload = JSON.stringify({
      entity: "event",
      id: "evt_123456",
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_123" } } },
    });

    it("verifies valid raw-body webhook signature", async () => {
      const validSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawPayload)
        .digest("hex");

      const result = await provider.verifyWebhook({
        rawPayload,
        signature: validSignature,
      });

      expect(result.verified).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.id).toBe("evt_123456");
    });

    it("rejects webhook if signature was computed with a different secret", async () => {
      const invalidSignature = crypto
        .createHmac("sha256", "wrong_secret")
        .update(rawPayload)
        .digest("hex");

      const result = await provider.verifyWebhook({
        rawPayload,
        signature: invalidSignature,
      });

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("Invalid webhook signature");
    });

    it("rejects if payload is empty", async () => {
      const result = await provider.verifyWebhook({
        rawPayload: "",
        signature: "some_sig",
      });

      expect(result.verified).toBe(false);
    });
  });

  describe("createPaymentOrder validation", () => {
    it("rejects zero or negative amount", async () => {
      await expect(
        provider.createPaymentOrder({
          amountMinor: 0,
          currency: "INR",
          receipt: "rcpt_1",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("rejects unsupported currencies", async () => {
      await expect(
        provider.createPaymentOrder({
          amountMinor: 10000,
          currency: "USD",
          receipt: "rcpt_1",
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
