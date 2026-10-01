/**
 * VÉRONA — Razorpay Payment Gateway Provider Adapter
 *
 * Implements IPaymentProvider using standard HTTPS REST calls and native
 * Node.js crypto for timing-safe HMAC SHA-256 signature verification.
 * Isolates provider credentials exclusively to the server.
 */

import crypto from "node:crypto";
import {
  IPaymentProvider,
  CreatePaymentOrderParams,
  ProviderOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  VerifyWebhookParams,
  VerifyWebhookResult,
  ProviderPaymentDetails,
  ProviderOrderDetails,
  CreateRefundParams,
  ProviderRefundResult,
  GetRefundResult,
} from "../types/payment.types";
import { env } from "@/config/env";
import { AppError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export class RazorpayPaymentProvider implements IPaymentProvider {
  readonly providerName = "razorpay";
  private readonly baseUrl = "https://api.razorpay.com/v1";
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    keyId: string = env.RAZORPAY_KEY_ID,
    keySecret: string = env.RAZORPAY_KEY_SECRET,
    webhookSecret: string = env.RAZORPAY_WEBHOOK_SECRET
  ) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
  }

  getPublicKey(): string {
    return this.keyId;
  }

  private getAuthHeader(): string {
    const credentials = `${this.keyId}:${this.keySecret}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  /**
   * Creates an order with Razorpay in minor units (paise).
   */
  async createPaymentOrder(params: CreatePaymentOrderParams): Promise<ProviderOrderResult> {
    if (params.amountMinor <= 0) {
      throw new ValidationError("Payment amount must be greater than zero");
    }
    if (params.currency !== "INR") {
      throw new ValidationError(`Unsupported currency: ${params.currency}. Razorpay currently configured for INR.`);
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: params.amountMinor,
          currency: params.currency,
          receipt: params.receipt,
          notes: params.notes || {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("Razorpay order creation failed", {
          context: "RazorpayPaymentProvider",
          metadata: { status: response.status, error: data?.error },
        });
        throw new AppError(
          data?.error?.description || "Payment provider order creation failed",
          "PAYMENT_PROVIDER_ERROR",
          response.status >= 500 ? 502 : 400
        );
      }

      return {
        providerOrderId: data.id,
        amountMinor: data.amount,
        currency: data.currency,
        status: data.status,
        provider: this.providerName,
        createdAt: data.created_at,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      logger.error("Razorpay order network error", {
        context: "RazorpayPaymentProvider",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
      throw new AppError("Failed to communicate with payment gateway", "PAYMENT_GATEWAY_UNAVAILABLE", 503);
    }
  }

  /**
   * Cryptographically verifies the Razorpay payment signature from client callback.
   * Uses timing-safe string comparison.
   */
  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const { providerOrderId, providerPaymentId, signature } = params;

    if (!providerOrderId || !providerPaymentId || !signature) {
      return {
        verified: false,
        providerPaymentId,
        providerOrderId,
        reason: "Missing order, payment ID, or signature parameters",
      };
    }

    const payload = `${providerOrderId}|${providerPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(payload)
      .digest("hex");

    const isMatch =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isMatch) {
      logger.warn("Razorpay payment signature mismatch", {
        context: "RazorpayPaymentProvider",
        metadata: { providerOrderId, providerPaymentId },
      });
      return {
        verified: false,
        providerPaymentId,
        providerOrderId,
        reason: "Cryptographic signature verification failed",
      };
    }

    return {
      verified: true,
      providerPaymentId,
      providerOrderId,
    };
  }

  /**
   * Cryptographically verifies incoming Razorpay webhook signature against raw payload.
   */
  async verifyWebhook(params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    const { rawPayload, signature, secret } = params;
    const activeSecret = secret || this.webhookSecret;

    if (!rawPayload || !signature) {
      return { verified: false, reason: "Missing payload or signature" };
    }

    const expectedSignature = crypto
      .createHmac("sha256", activeSecret)
      .update(rawPayload)
      .digest("hex");

    const isMatch =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isMatch) {
      logger.warn("Razorpay webhook signature verification failed", {
        context: "RazorpayPaymentProvider",
      });
      return { verified: false, reason: "Invalid webhook signature" };
    }

    try {
      const event = JSON.parse(rawPayload);
      return { verified: true, event };
    } catch {
      return { verified: false, reason: "Malformed JSON payload" };
    }
  }

  /**
   * Fetches payment details directly from Razorpay.
   */
  async fetchPayment(providerPaymentId: string): Promise<ProviderPaymentDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${providerPaymentId}`, {
        method: "GET",
        headers: { Authorization: this.getAuthHeader() },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new AppError(
          data?.error?.description || "Failed to fetch payment details",
          "PAYMENT_NOT_FOUND",
          response.status
        );
      }

      return {
        id: data.id,
        orderId: data.order_id,
        amountMinor: data.amount,
        currency: data.currency,
        status: data.status,
        method: data.method,
        email: data.email,
        contact: data.contact,
        errorDescription: data.error_description,
        createdAt: data.created_at,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError("Payment provider query failed", "GATEWAY_ERROR", 503);
    }
  }

  /**
   * Fetches order details directly from Razorpay.
   */
  async fetchPaymentOrder(providerOrderId: string): Promise<ProviderOrderDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${providerOrderId}`, {
        method: "GET",
        headers: { Authorization: this.getAuthHeader() },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new AppError(
          data?.error?.description || "Failed to fetch order details",
          "ORDER_NOT_FOUND",
          response.status
        );
      }

      return {
        id: data.id,
        amountMinor: data.amount,
        amountPaidMinor: data.amount_paid,
        currency: data.currency,
        status: data.status,
        receipt: data.receipt,
        createdAt: data.created_at,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError("Payment order query failed", "GATEWAY_ERROR", 503);
    }
  }

  /**
   * Dispatches a refund request directly to Razorpay.
   * Does NOT treat timeouts as failure; throws REFUND_PROVIDER_TIMEOUT to trigger reconciliation.
   */
  async createRefund(params: CreateRefundParams): Promise<ProviderRefundResult> {
    if (params.amountMinor <= 0) {
      throw new ValidationError("Refund amount must be strictly greater than zero");
    }
    if (params.currency !== "INR") {
      throw new ValidationError(`Unsupported refund currency: ${params.currency}. Expected INR.`);
    }
    if (!params.providerPaymentId) {
      throw new ValidationError("Provider payment ID is required to initiate provider refund");
    }

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      "Content-Type": "application/json",
    };
    if (params.idempotencyKey) {
      headers["X-Refund-Idempotency-Key"] = params.idempotencyKey;
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${params.providerPaymentId}/refund`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: params.amountMinor,
          receipt: params.receipt,
          notes: params.notes || {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("Razorpay refund dispatch failed", {
          context: "RazorpayPaymentProvider.createRefund",
          metadata: { status: response.status, error: data?.error, paymentId: params.providerPaymentId },
        });

        // 4xx client errors indicate explicit rejection
        throw new AppError(
          data?.error?.description || "Payment provider refund rejected",
          data?.error?.code || "REFUND_PROVIDER_ERROR",
          response.status
        );
      }

      return {
        providerRefundId: data.id,
        providerPaymentId: data.payment_id,
        amountMinor: data.amount,
        currency: data.currency,
        status: data.status, // "processed" | "pending" | "failed"
        receipt: data.receipt,
        createdAt: data.created_at,
        rawResponse: data,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      logger.error("Razorpay refund network timeout or error", {
        context: "RazorpayPaymentProvider.createRefund",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
      // Network timeout / connection drop must trigger reconciliation, not blind retry
      throw new AppError(
        "Payment provider refund timed out or connection interrupted",
        "REFUND_PROVIDER_TIMEOUT",
        504
      );
    }
  }

  /**
   * Fetches refund status from Razorpay for authoritative reconciliation.
   */
  async getRefund(providerRefundId: string): Promise<GetRefundResult> {
    if (!providerRefundId) {
      throw new ValidationError("Provider refund ID is required to query refund status");
    }

    try {
      const response = await fetch(`${this.baseUrl}/refunds/${providerRefundId}`, {
        method: "GET",
        headers: { Authorization: this.getAuthHeader() },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new AppError(
          data?.error?.description || "Refund not found on payment gateway",
          "REFUND_NOT_FOUND",
          response.status
        );
      }

      return {
        providerRefundId: data.id,
        providerPaymentId: data.payment_id,
        amountMinor: data.amount,
        currency: data.currency,
        status: data.status,
        receipt: data.receipt,
        createdAt: data.created_at,
        rawResponse: data,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch refund status from payment gateway", "GATEWAY_ERROR", 503);
    }
  }
}

export const razorpayPaymentProvider = new RazorpayPaymentProvider();
