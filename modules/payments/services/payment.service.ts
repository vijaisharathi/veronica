/**
 * VÉRONA — Payment Domain Orchestration Service
 *
 * Single authoritative source of truth for payment lifecycle management:
 * - Payment initiation derived from Phase 17 checkout (zero client-controlled totals)
 * - Anti-IDOR: Strict customer ownership derivation
 * - Cryptographic HMAC SHA-256 signature verification
 * - Idempotent webhook processing and reconciliation
 * - Failure handling and safe retry attempts (preserving customer cart)
 * - Produces Phase 19 PaymentResult contract without executing order/inventory operations
 */

import crypto from "node:crypto";
import { PaymentRepository, paymentRepository } from "../repositories/payment.repository";
import {
  IPaymentProvider,
  CreatePaymentInput,
  PaymentInitializationDTO,
  VerifyPaymentInput,
  PaymentVerificationDTO,
  PaymentStatusDTO,
  PaymentResult,
} from "../types/payment.types";
import { razorpayPaymentProvider } from "../providers/razorpay.provider";
import { assertValidPaymentTransition } from "../validators/payment-state-machine";
import { checkoutService } from "@/modules/checkout";
import { PaymentStatus } from "@/constants/status";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  AppError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { CustomerModel } from "@/db/models";
import { ICustomer } from "@/types/database";

export class PaymentService {
  constructor(
    private readonly repo: PaymentRepository = paymentRepository,
    private readonly provider: IPaymentProvider = razorpayPaymentProvider
  ) {}

  /**
   * Initiates a payment session from an authoritative Phase 17 checkout.
   * Derives customer, cart, and amount strictly from the server.
   */
  async initiatePayment(
    customerId: string,
    input: CreatePaymentInput
  ): Promise<PaymentInitializationDTO> {
    if (!customerId) {
      throw new ValidationError("Customer identification required");
    }

    const { checkoutSessionId, idempotencyKey } = input;

    // 1. Authoritative Phase 17 checkout validation
    const validation = await checkoutService.validateCheckout(customerId, checkoutSessionId);
    if (!validation.valid || validation.issues.length > 0) {
      throw new ValidationError(
        "Checkout validation failed. Please resolve all checkout issues before continuing to payment.",
        validation.issues
      );
    }

    const { checkout } = validation;
    const amountMinor = checkout.pricing.amountDueBeforePaymentMinor;
    const currency = checkout.pricing.currency;

    if (amountMinor <= 0) {
      throw new ValidationError("Payment amount must be greater than zero");
    }

    // 2. Fetch customer details for Razorpay prefill
    const customer = await CustomerModel.findById(customerId).lean<ICustomer>();

    // 3. Check for existing payment on this checkout session
    let payment = await this.repo.findPaymentByCheckoutSession(checkoutSessionId);

    if (payment && payment.status === PaymentStatus.CAPTURED) {
      throw new AppError(
        "Payment has already been captured for this checkout session",
        "PAYMENT_ALREADY_CAPTURED",
        400
      );
    }

    // 4. Create Razorpay Payment Order
    const receipt = `rcpt_${checkoutSessionId.slice(-8)}_${Date.now().toString().slice(-4)}`;
    const providerOrder = await this.provider.createPaymentOrder({
      amountMinor,
      currency,
      receipt,
      notes: {
        customerId,
        checkoutSessionId,
      },
    });

    const attemptId = `att_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    if (!payment) {
      // Create fresh payment record
      payment = await this.repo.createPayment({
        customerId,
        checkoutSessionId,
        provider: this.provider.providerName,
        providerOrderId: providerOrder.providerOrderId,
        amount: amountMinor,
        amountMinor,
        currency,
        status: PaymentStatus.PENDING,
        attemptsCount: 1,
      });

      await this.repo.recordStatusHistory({
        paymentId: payment._id.toString(),
        fromStatus: PaymentStatus.CREATED,
        toStatus: PaymentStatus.PENDING,
        source: "SYSTEM",
        timestamp: new Date(),
        metadata: { providerOrderId: providerOrder.providerOrderId },
      });
    } else {
      // Reuse payment, increment attempts and update providerOrderId
      assertValidPaymentTransition(payment.status, PaymentStatus.PENDING);
      payment = await this.repo.updatePayment(payment._id.toString(), {
        providerOrderId: providerOrder.providerOrderId,
        amount: amountMinor,
        amountMinor,
        status: PaymentStatus.PENDING,
        attemptsCount: (payment.attemptsCount || 1) + 1,
      });

      await this.repo.recordStatusHistory({
        paymentId: payment!._id.toString(),
        fromStatus: payment!.status,
        toStatus: PaymentStatus.PENDING,
        source: "SYSTEM",
        timestamp: new Date(),
        metadata: { providerOrderId: providerOrder.providerOrderId },
      });
    }

    // 5. Create atomic PaymentAttempt record
    await this.repo.createPaymentAttempt({
      attemptId,
      paymentId: payment!._id.toString(),
      checkoutSessionId,
      provider: this.provider.providerName,
      providerOrderId: providerOrder.providerOrderId,
      amount: amountMinor,
      amountMinor,
      currency,
      status: PaymentStatus.PENDING,
      idempotencyKey,
    });

    logger.info("Initiated payment order", {
      context: "PaymentService",
      metadata: {
        paymentId: payment!._id.toString(),
        providerOrderId: providerOrder.providerOrderId,
        amountMinor,
        customerId,
      },
    });

    return {
      paymentId: payment!._id.toString(),
      provider: this.provider.providerName,
      providerOrderId: providerOrder.providerOrderId,
      amountMinor,
      currency,
      publicKeyId: this.provider.getPublicKey(),
      checkoutSessionId,
      customer: {
        name: customer?.displayName || `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || undefined,
        email: customer?.email || undefined,
        phone: customer?.phone || undefined,
      },
    };
  }

  /**
   * Cryptographically verifies the payment callback from client Razorpay Checkout.
   */
  async verifyPayment(
    customerId: string,
    input: VerifyPaymentInput
  ): Promise<PaymentVerificationDTO> {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

    // 1. Anti-IDOR: verify payment ownership
    const payment = await this.repo.findPaymentByCustomerAndId(customerId, paymentId);
    if (!payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    if (payment.customerId.toString() !== customerId) {
      throw new AuthorizationError("Access denied: You do not own this payment record", "PAYMENT_NOT_OWNED");
    }

    // 2. Validate order reference match
    if (payment.providerOrderId && payment.providerOrderId !== razorpayOrderId) {
      logger.error("Provider order mismatch on verification", {
        context: "PaymentService",
        metadata: { paymentId, expected: payment.providerOrderId, received: razorpayOrderId },
      });
      throw new ValidationError("Payment provider order reference mismatch");
    }

    // 3. Cryptographic signature verification
    const verification = await this.provider.verifyPayment({
      providerOrderId: razorpayOrderId,
      providerPaymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!verification.verified) {
      // Record failure attempt
      await this.repo.updatePaymentAttempt(razorpayOrderId, {
        status: PaymentStatus.FAILED,
        failureCode: "INVALID_SIGNATURE",
        failureMessage: verification.reason || "Cryptographic signature mismatch",
      });

      await this.repo.updatePayment(paymentId, {
        status: PaymentStatus.FAILED,
      });

      await this.repo.recordStatusHistory({
        paymentId,
        fromStatus: payment.status,
        toStatus: PaymentStatus.FAILED,
        source: "CLIENT_VERIFY",
        timestamp: new Date(),
        metadata: { razorpayOrderId, razorpayPaymentId, reason: verification.reason },
      });

      throw new ValidationError(
        "Payment verification failed. Cryptographic signature does not match provider specifications."
      );
    }

    // 4. Update status to CAPTURED
    assertValidPaymentTransition(payment.status, PaymentStatus.CAPTURED);

    const updatedPayment = await this.repo.updatePayment(paymentId, {
      status: PaymentStatus.CAPTURED,
      providerPaymentId: razorpayPaymentId,
    });

    // Update attempt
    await this.repo.updatePaymentAttempt(razorpayOrderId, {
      status: PaymentStatus.CAPTURED,
      providerPaymentId: razorpayPaymentId,
    });

    // Record audit status history
    await this.repo.recordStatusHistory({
      paymentId,
      fromStatus: payment.status,
      toStatus: PaymentStatus.CAPTURED,
      source: "CLIENT_VERIFY",
      timestamp: new Date(),
      metadata: { razorpayOrderId, razorpayPaymentId },
    });

    logger.info("Payment verified and captured", {
      context: "PaymentService",
      metadata: { paymentId, providerPaymentId: razorpayPaymentId, customerId },
    });

    return {
      paymentId,
      status: PaymentStatus.CAPTURED,
      amountMinor: updatedPayment!.amount,
      currency: updatedPayment!.currency,
      provider: updatedPayment!.provider,
      providerPaymentId: razorpayPaymentId,
      checkoutSessionId: updatedPayment!.checkoutSessionId.toString(),
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Idempotently processes incoming Razorpay Webhooks.
   * Handles payment.captured, payment.failed, order.paid.
   */
  async processWebhook(
    rawPayload: string,
    signature: string
  ): Promise<{ status: string; handled: boolean; eventId?: string }> {
    // 1. Cryptographically verify webhook signature
    const verification = await this.provider.verifyWebhook({ rawPayload, signature });
    if (!verification.verified || !verification.event) {
      logger.warn("Rejected invalid webhook signature", { context: "PaymentService" });
      throw new ValidationError("Invalid webhook signature");
    }

    const event = verification.event;
    const eventId = String(event.id || (event as any).event_id || "");
    const eventType = String(event.event || "");

    if (!eventId) {
      throw new ValidationError("Missing webhook event identifier");
    }

    // 2. Webhook Idempotency Check
    const existingEvent = await this.repo.findWebhookEvent(this.provider.providerName, eventId);
    if (existingEvent && existingEvent.status === "PROCESSED") {
      logger.info("Duplicate webhook event ignored idempotently", {
        context: "PaymentService",
        metadata: { provider: this.provider.providerName, eventId, eventType },
      });
      return { status: "DUPLICATE", handled: true, eventId };
    }

    // Record pending event
    let recordedEvent = existingEvent;
    if (!recordedEvent) {
      recordedEvent = await this.repo.recordWebhookEvent({
        provider: this.provider.providerName,
        eventId,
        eventType,
        payload: event,
        status: "PENDING",
        receivedAt: new Date(),
      });
    }

    try {
      const payloadData: any = event.payload || {};

      if (eventType === "payment.captured" || eventType === "order.paid") {
        const paymentEntity = payloadData.payment?.entity || {};
        const providerOrderId = paymentEntity.order_id || payloadData.order?.entity?.id;
        const providerPaymentId = paymentEntity.id;

        if (providerOrderId) {
          const payment = await this.repo.findPaymentByProviderOrderId(providerOrderId);
          if (payment && payment.status !== PaymentStatus.CAPTURED) {
            assertValidPaymentTransition(payment.status, PaymentStatus.CAPTURED);
            await this.repo.updatePayment(payment._id.toString(), {
              status: PaymentStatus.CAPTURED,
              providerPaymentId: providerPaymentId || payment.providerPaymentId,
            });

            await this.repo.recordStatusHistory({
              paymentId: payment._id.toString(),
              fromStatus: payment.status,
              toStatus: PaymentStatus.CAPTURED,
              source: "WEBHOOK",
              providerEventId: eventId,
              timestamp: new Date(),
              metadata: { eventType, providerPaymentId, providerOrderId },
            });
          }
        }
      } else if (eventType === "payment.failed") {
        const paymentEntity = payloadData.payment?.entity || {};
        const providerOrderId = paymentEntity.order_id;
        const providerPaymentId = paymentEntity.id;
        const failureCode = paymentEntity.error_code;
        const failureMessage = paymentEntity.error_description;

        if (providerOrderId) {
          const payment = await this.repo.findPaymentByProviderOrderId(providerOrderId);
          if (payment && payment.status !== PaymentStatus.CAPTURED) {
            await this.repo.updatePayment(payment._id.toString(), {
              status: PaymentStatus.FAILED,
            });

            await this.repo.updatePaymentAttempt(providerOrderId, {
              status: PaymentStatus.FAILED,
              failureCode,
              failureMessage,
            });

            await this.repo.recordStatusHistory({
              paymentId: payment._id.toString(),
              fromStatus: payment.status,
              toStatus: PaymentStatus.FAILED,
              source: "WEBHOOK",
              providerEventId: eventId,
              timestamp: new Date(),
              metadata: { eventType, failureCode, failureMessage },
            });
          }
        }
      } else if (eventType.startsWith("refund.")) {
        // Phase 23 — Authoritative refund webhook processing
        const { refundService } = await import("@/modules/refunds");
        await refundService.handleRefundWebhook({ rawPayload, signature });
      }

      // Mark webhook successfully processed
      await this.repo.updateWebhookEvent(recordedEvent._id.toString(), {
        status: "PROCESSED",
        processedAt: new Date(),
      });

      return { status: "PROCESSED", handled: true, eventId };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.repo.updateWebhookEvent(recordedEvent._id.toString(), {
        status: "FAILED",
        error: errorMsg,
      });
      logger.error("Error processing webhook event", {
        context: "PaymentService",
        metadata: { eventId, eventType, error: errorMsg },
      });
      throw error;
    }
  }

  /**
   * Retrieves full payment status with customer ownership verification.
   * Performs real-time reconciliation with payment gateway if status is PENDING or UNKNOWN.
   */
  async getPaymentStatus(customerId: string, paymentId: string): Promise<PaymentStatusDTO> {
    const payment = await this.repo.findPaymentByCustomerAndId(customerId, paymentId);
    if (!payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    if (payment.customerId.toString() !== customerId) {
      throw new AuthorizationError("Access denied: You do not own this payment record", "PAYMENT_NOT_OWNED");
    }

    // Reconciliation Check: If PENDING or UNKNOWN, check gateway state
    let currentStatus = payment.status;
    if (
      (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.UNKNOWN) &&
      payment.providerOrderId
    ) {
      try {
        const orderDetails = await this.provider.fetchPaymentOrder(payment.providerOrderId);
        if (orderDetails.status === "paid") {
          currentStatus = PaymentStatus.CAPTURED;
          await this.repo.updatePayment(paymentId, { status: PaymentStatus.CAPTURED });
          await this.repo.recordStatusHistory({
            paymentId,
            fromStatus: payment.status,
            toStatus: PaymentStatus.CAPTURED,
            source: "RECONCILIATION",
            timestamp: new Date(),
            metadata: { providerOrderId: payment.providerOrderId },
          });
        }
      } catch (err: unknown) {
        logger.warn("Reconciliation query failed silently", {
          context: "PaymentService",
          metadata: { paymentId, error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    const attempts = await this.repo.findAttemptsByPaymentId(paymentId);

    return {
      id: payment._id.toString(),
      checkoutSessionId: payment.checkoutSessionId.toString(),
      customerId: payment.customerId.toString(),
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      amountMinor: payment.amount,
      currency: payment.currency,
      status: currentStatus,
      method: payment.method,
      attempts: attempts.map((a) => ({
        attemptId: a.attemptId,
        providerOrderId: a.providerOrderId || "",
        providerPaymentId: a.providerPaymentId,
        amountMinor: a.amount,
        currency: a.currency,
        status: a.status,
        failureCode: a.failureCode,
        failureMessage: a.failureMessage,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
      })),
      createdAt: payment.createdAt instanceof Date ? payment.createdAt.toISOString() : String(payment.createdAt),
      updatedAt: payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : String(payment.updatedAt),
    };
  }

  /**
   * Safe payment retry: creates a new attempt under existing payment after failure.
   */
  async retryPayment(
    customerId: string,
    paymentId: string
  ): Promise<PaymentInitializationDTO> {
    const payment = await this.repo.findPaymentByCustomerAndId(customerId, paymentId);
    if (!payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    if (payment.customerId.toString() !== customerId) {
      throw new AuthorizationError("Access denied", "PAYMENT_NOT_OWNED");
    }

    if (payment.status === PaymentStatus.CAPTURED) {
      throw new AppError("Payment is already captured", "PAYMENT_ALREADY_CAPTURED", 400);
    }

    // Revalidate checkout to verify no price/stock changes occurred during failure
    return this.initiatePayment(customerId, {
      checkoutSessionId: payment.checkoutSessionId.toString(),
    });
  }

  /**
   * Produces future-ready Phase 19 PaymentResult contract.
   */
  getPaymentResultContract(payment: PaymentStatusDTO): PaymentResult {
    return {
      paymentId: payment.id,
      checkoutSessionId: payment.checkoutSessionId,
      customerId: payment.customerId,
      status: payment.status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      providerOrderId: payment.providerOrderId,
    };
  }
}

export const paymentService = new PaymentService();
