/**
 * VÉRONA — Refund Orchestration Service
 *
 * Central authoritative service for refund lifecycle operations:
 * - Return-driven settlements (Phase 22 handoff)
 * - Order cancellations (Phase 19 handoff)
 * - Manual staff adjustments (Permission-guarded)
 * - Idempotent payment provider dispatch
 * - Controlled retry and reconciliation handling
 * - Cryptographic webhook ingestion & deduplication
 * - Comprehensive audit logging
 */

import crypto from "node:crypto";
import {
  RefundRepository,
  refundRepository,
} from "../repositories/refund.repository";
import {
  RefundEligibilityService,
  refundEligibilityService,
} from "../eligibility/refund-eligibility.service";
import {
  RefundCalculationService,
  refundCalculationService,
} from "../calculations/refund-calculation.service";
import {
  RefundReconciliationService,
  refundReconciliationService,
} from "../reconciliation/refund-reconciliation.service";
import { IPaymentProvider } from "@/modules/payments/types/payment.types";
import { razorpayPaymentProvider } from "@/modules/payments/providers/razorpay.provider";
import {
  RefundStatus,
  RefundType,
  RefundSourceType,
  RefundAttemptStatus,
  AuditActorType,
} from "@/constants/status";
import {
  IRefund,
  IRefundAttempt,
  IOrderItemSnapshot,
} from "@/types/database";
import {
  AdminRefundQueryFilters,
  CustomerRefundDTO,
  CustomerRefundDetailDTO,
  AdminRefundDTO,
} from "../types/refund.types";
import { CreateManualRefundInput } from "../validators/refund.validators";
import {
  assertValidRefundTransition,
  RefundStatusMapper,
} from "../state-machine/refund-state-machine";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { AuditLogModel, CustomerModel, PaymentModel } from "@/db/models";

export class RefundService {
  constructor(
    private readonly repo: RefundRepository = refundRepository,
    private readonly eligibilityService: RefundEligibilityService = refundEligibilityService,
    private readonly calculationService: RefundCalculationService = refundCalculationService,
    private readonly reconciliationService: RefundReconciliationService = refundReconciliationService,
    private readonly provider: IPaymentProvider = razorpayPaymentProvider
  ) {}

  /**
   * Consumes a completed/approved Phase 22 return and initiates an automatic refund.
   */
  async requestReturnRefund(
    returnRequestId: string,
    actorId: string = "SYSTEM"
  ): Promise<IRefund> {
    logger.info("Initiating return-driven refund request", {
      context: "RefundService.requestReturnRefund",
      metadata: { returnRequestId, actorId },
    });

    // 1. Evaluate Return Eligibility & Load Financial Snapshots
    const eligibility = await this.eligibilityService.evaluateEligibility({
      orderId: "", // Will be derived if we pass returnRequestId
      returnRequestId,
      sourceType: RefundSourceType.RETURN,
      sourceId: returnRequestId,
    });

    const { order, payment, returnRequest, capturedAmountMinor, previouslyRefundedMinor } = eligibility;
    if (!returnRequest) {
      throw new ValidationError("Return request not found on evaluated eligibility");
    }

    // 2. Map Return Items to Calculation Engine
    const itemsToRefund = returnRequest.items.map((it) => ({
      orderItemId: it.orderItemId,
      quantity: it.quantity,
    }));

    const calcResult = this.calculationService.calculateRefund({
      orderPricing: order.pricing,
      orderItems: order.items,
      coupon: order.coupon,
      paidAmountMinor: capturedAmountMinor,
      previouslyRefundedMinor,
      itemsToRefund,
      refundShipping: false, // Default: returns do not refund original outbound shipping
      sourceType: RefundSourceType.RETURN,
      reason: `Return refund for ${returnRequest.returnNumber}`,
    });

    // 3. Generate Sequential Safe Refund Reference
    const refundNumber = await this.repo.generateRefundNumber();

    // 4. Create Authoritative Refund Record
    const refund = await this.repo.createRefund({
      refundNumber,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      paymentId: payment._id.toString(),
      customerId: order.customerId.toString(),
      returnRequestId: returnRequest._id.toString(),
      amount: calcResult.finalRefundAmountMinor,
      currency: "INR",
      reason: `Return settlement for ${returnRequest.returnNumber}: ${returnRequest.reason}`,
      type: RefundType.RETURN,
      sourceType: RefundSourceType.RETURN,
      sourceId: returnRequest._id.toString(),
      status: RefundStatus.REQUESTED,
      provider: payment.provider || "razorpay",
      initiatedBy: actorId,
      calculationSnapshot: calcResult.calculationSnapshot,
      attempts: [],
    });

    await this.logAudit({
      actorId,
      actorType: actorId === "SYSTEM" ? AuditActorType.SYSTEM : AuditActorType.STAFF,
      action: "REFUND_REQUESTED",
      entityId: refund._id.toString(),
      metadata: {
        refundNumber: refund.refundNumber,
        amount: refund.amount,
        returnNumber: returnRequest.returnNumber,
      },
    });

    // Transition to ELIGIBLE
    assertValidRefundTransition(RefundStatus.REQUESTED, RefundStatus.ELIGIBLE);
    const eligibleRefund = await this.repo.updateStatus(
      refund._id.toString(),
      RefundStatus.REQUESTED,
      RefundStatus.ELIGIBLE
    );

    // 5. Automatically Dispatch to Payment Provider
    return await this.initiateProviderRefund(eligibleRefund ? eligibleRefund._id.toString() : refund._id.toString(), actorId);
  }

  /**
   * Consumes a cancellation event and initiates an order refund.
   */
  async requestCancellationRefund(
    orderId: string,
    reason: string,
    actorId: string = "SYSTEM"
  ): Promise<IRefund> {
    logger.info("Initiating cancellation refund request", {
      context: "RefundService.requestCancellationRefund",
      metadata: { orderId, reason, actorId },
    });

    // 1. Evaluate Eligibility
    const eligibility = await this.eligibilityService.evaluateEligibility({
      orderId,
      sourceType: RefundSourceType.ORDER_CANCELLATION,
      sourceId: orderId,
    });

    const { order, payment, capturedAmountMinor, previouslyRefundedMinor } = eligibility;

    // Check duplicate cancellation refund
    const existingRefund = await this.repo.findBySource(
      RefundSourceType.ORDER_CANCELLATION,
      order._id.toString()
    );
    if (existingRefund && existingRefund.status !== RefundStatus.FAILED) {
      return existingRefund;
    }

    // 2. Full Order Calculation (Shipping refundable on cancellation)
    const calcResult = this.calculationService.calculateRefund({
      orderPricing: order.pricing,
      orderItems: order.items,
      coupon: order.coupon,
      paidAmountMinor: capturedAmountMinor,
      previouslyRefundedMinor,
      refundShipping: true,
      sourceType: RefundSourceType.ORDER_CANCELLATION,
      reason,
    });

    const refundNumber = await this.repo.generateRefundNumber();

    // 3. Create Record
    const refund = await this.repo.createRefund({
      refundNumber,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      paymentId: payment._id.toString(),
      customerId: order.customerId.toString(),
      amount: calcResult.finalRefundAmountMinor,
      currency: "INR",
      reason: `Order cancellation refund: ${reason}`,
      type: RefundType.CANCELLATION,
      sourceType: RefundSourceType.ORDER_CANCELLATION,
      sourceId: order._id.toString(),
      status: RefundStatus.REQUESTED,
      provider: payment.provider || "razorpay",
      initiatedBy: actorId,
      calculationSnapshot: calcResult.calculationSnapshot,
      attempts: [],
    });

    await this.logAudit({
      actorId,
      actorType: actorId === "SYSTEM" ? AuditActorType.SYSTEM : AuditActorType.STAFF,
      action: "REFUND_REQUESTED_CANCELLATION",
      entityId: refund._id.toString(),
      metadata: { refundNumber, amount: refund.amount, orderId },
    });

    // Advance to ELIGIBLE
    await this.repo.updateStatus(refund._id.toString(), RefundStatus.REQUESTED, RefundStatus.ELIGIBLE);

    return await this.initiateProviderRefund(refund._id.toString(), actorId);
  }

  /**
   * Authorized admin manual refund initiation.
   */
  async createManualRefund(
    input: CreateManualRefundInput,
    adminActorId: string
  ): Promise<IRefund> {
    const { orderId, amountMinor, reason, refundShipping } = input;

    logger.info("Admin creating manual refund", {
      context: "RefundService.createManualRefund",
      metadata: { orderId, amountMinor, adminActorId },
    });

    // 1. Evaluate Eligibility
    const eligibility = await this.eligibilityService.evaluateEligibility({
      orderId,
      sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
    });

    const { order, payment, capturedAmountMinor, previouslyRefundedMinor } = eligibility;

    // 2. Server-side Calculation & Validation
    const calcResult = this.calculationService.calculateRefund({
      orderPricing: order.pricing,
      orderItems: order.items,
      coupon: order.coupon,
      paidAmountMinor: capturedAmountMinor,
      previouslyRefundedMinor,
      customAdjustmentMinor: amountMinor,
      refundShipping,
      sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
      reason,
    });

    const refundNumber = await this.repo.generateRefundNumber();

    const refund = await this.repo.createRefund({
      refundNumber,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      paymentId: payment._id.toString(),
      customerId: order.customerId.toString(),
      amount: calcResult.finalRefundAmountMinor,
      currency: "INR",
      reason,
      type: RefundType.MANUAL_ADJUSTMENT,
      sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
      status: RefundStatus.REQUESTED,
      provider: payment.provider || "razorpay",
      initiatedBy: adminActorId,
      approvedBy: adminActorId,
      calculationSnapshot: calcResult.calculationSnapshot,
      attempts: [],
    });

    await this.logAudit({
      actorId: adminActorId,
      actorType: AuditActorType.STAFF,
      action: "REFUND_MANUAL_CREATED",
      entityId: refund._id.toString(),
      metadata: { refundNumber, amount: refund.amount, adminActorId },
    });

    await this.repo.updateStatus(refund._id.toString(), RefundStatus.REQUESTED, RefundStatus.ELIGIBLE);

    return await this.initiateProviderRefund(refund._id.toString(), adminActorId);
  }

  /**
   * Dispatches the refund to the external payment provider.
   * Strict Idempotency: Will not call gateway if already initiated or processing.
   */
  async initiateProviderRefund(
    refundId: string,
    actorId: string = "SYSTEM"
  ): Promise<IRefund> {
    const refund = await this.repo.findById(refundId);
    if (!refund) {
      throw new NotFoundError("Refund not found for provider dispatch");
    }

    // Idempotency check: Do not re-dispatch if already in progress or completed
    if (
      refund.status === RefundStatus.INITIATED ||
      refund.status === RefundStatus.PROCESSING ||
      refund.status === RefundStatus.COMPLETED
    ) {
      logger.info("Refund already in progress or completed. Skipping redundant dispatch.", {
        context: "RefundService.initiateProviderRefund",
        metadata: { refundNumber: refund.refundNumber, status: refund.status },
      });
      return refund;
    }

    // Validate Transition to INITIATED
    assertValidRefundTransition(refund.status, RefundStatus.INITIATED);

    const idempotencyKey = `REF-IDEMP-${refund.refundNumber}-${Date.now()}`;
    const attemptId = crypto.randomUUID();

    const initialAttempt: IRefundAttempt = {
      attemptId,
      provider: refund.provider,
      idempotencyKey,
      amount: refund.amount,
      currency: refund.currency,
      status: RefundAttemptStatus.INITIATED,
      createdAt: new Date(),
    };

    // Atomically advance to INITIATED and register attempt
    await this.repo.updateStatus(refund._id.toString(), refund.status, RefundStatus.INITIATED, {
      initiatedAt: new Date(),
    });
    await this.repo.addAttempt(refund._id.toString(), initialAttempt);

    // Fetch authoritative provider payment ID from payment record
    const payment = await PaymentModel.findById(refund.paymentId).lean();
    if (!payment || !payment.providerPaymentId) {
      const err = new AppError("Payment record is missing external provider payment ID", "PAYMENT_NOT_REFUNDABLE", 400);
      await this.markRefundFailed(refund._id.toString(), "MISSING_PROVIDER_PAYMENT_ID", err.message, attemptId);
      throw err;
    }

    try {
      logger.info("Dispatching refund to payment gateway", {
        context: "RefundService.initiateProviderRefund",
        metadata: {
          refundNumber: refund.refundNumber,
          providerPaymentId: payment.providerPaymentId,
          amount: refund.amount,
        },
      });

      if (!this.provider.createRefund) {
        throw new AppError("Payment provider does not support refund initiation", "PROVIDER_NOT_CONFIGURED", 501);
      }

      const providerResult = await this.provider.createRefund({
        providerPaymentId: payment.providerPaymentId,
        amountMinor: refund.amount,
        currency: refund.currency,
        receipt: refund.refundNumber,
        notes: {
          refundNumber: refund.refundNumber,
          orderNumber: refund.orderNumber || "",
        },
        idempotencyKey,
      });

      const canonicalStatus = RefundStatusMapper.fromProviderStatus(providerResult.status);

      const updates: Partial<IRefund> = {
        providerRefundId: providerResult.providerRefundId,
        processedAt: new Date(),
      };

      if (canonicalStatus === RefundStatus.COMPLETED) {
        updates.status = RefundStatus.COMPLETED;
        updates.completedAt = new Date();
      } else {
        updates.status = RefundStatus.PROCESSING;
      }

      const updatedRefund = await this.repo.updateById(refund._id.toString(), updates);

      // Update attempt status
      await this.updateAttemptResult(refund._id.toString(), attemptId, {
        providerRefundId: providerResult.providerRefundId,
        status: RefundAttemptStatus.SUCCESS,
        completedAt: new Date(),
      });

      await this.logAudit({
        actorId,
        actorType: actorId === "SYSTEM" ? AuditActorType.SYSTEM : AuditActorType.STAFF,
        action: canonicalStatus === RefundStatus.COMPLETED ? "REFUND_COMPLETED" : "REFUND_PROCESSING",
        entityId: refund._id.toString(),
        metadata: {
          refundNumber: refund.refundNumber,
          providerRefundId: providerResult.providerRefundId,
          status: updates.status,
        },
      });

      return updatedRefund || refund;
    } catch (error: unknown) {
      if (error instanceof AppError && error.code === "REFUND_PROVIDER_TIMEOUT") {
        // CRITICAL SECTION 28 & 70: Timeout must NOT mark refund as failed or re-dispatch!
        logger.warn("Gateway refund request timed out. Flagging for authoritative reconciliation.", {
          context: "RefundService.initiateProviderRefund",
          metadata: { refundNumber: refund.refundNumber, error: error.message },
        });

        await this.repo.updateById(refund._id.toString(), {
          status: RefundStatus.RECONCILIATION_REQUIRED,
          reconciliationState: {
            lastCheckedAt: new Date(),
            mismatchDetected: false,
            notes: "Provider call timed out during creation. Authoritative reconciliation required.",
          },
        });

        await this.updateAttemptResult(refund._id.toString(), attemptId, {
          status: RefundAttemptStatus.TIMEOUT,
          errorMessage: error.message,
          completedAt: new Date(),
        });

        return (await this.repo.findById(refund._id.toString())) || refund;
      }

      // Explicit Rejection
      const errorMessage = error instanceof Error ? error.message : "Provider refund creation failed";
      const errorCode = error instanceof AppError ? error.code : "REFUND_PROVIDER_ERROR";

      await this.markRefundFailed(refund._id.toString(), errorCode, errorMessage, attemptId);

      logger.error("Provider refund creation rejected", {
        context: "RefundService.initiateProviderRefund",
        metadata: { refundNumber: refund.refundNumber, errorCode, errorMessage },
      });

      throw error;
    }
  }

  /**
   * Retries a failed refund after verifying failure and remaining balance.
   */
  async retryRefund(
    refundId: string,
    actorId: string,
    reason?: string
  ): Promise<IRefund> {
    const refund = await this.repo.findById(refundId);
    if (!refund) {
      throw new NotFoundError("Refund not found for retry");
    }

    if (refund.status !== RefundStatus.FAILED) {
      throw new AppError(
        `Only failed refunds can be retried. Current status is ${refund.status}.`,
        "REFUND_STATE_CONFLICT",
        400
      );
    }

    // Verify remaining balance still accommodates this refund
    const eligibility = await this.eligibilityService.evaluateEligibility({
      orderId: refund.orderId.toString(),
      sourceType: refund.sourceType,
    });

    if (refund.amount > eligibility.remainingRefundableMinor) {
      throw new AppError(
        "Cannot retry refund: Requested amount exceeds remaining refundable balance.",
        "REFUND_AMOUNT_EXCEEDS_REMAINING",
        400
      );
    }

    assertValidRefundTransition(RefundStatus.FAILED, RefundStatus.RETRY_PENDING);
    await this.repo.updateStatus(refund._id.toString(), RefundStatus.FAILED, RefundStatus.RETRY_PENDING, {
      notes: reason ? `Retry initiated: ${reason}` : "Retry initiated by staff",
    });

    await this.logAudit({
      actorId,
      actorType: AuditActorType.STAFF,
      action: "REFUND_RETRY_REQUESTED",
      entityId: refund._id.toString(),
      metadata: { refundNumber: refund.refundNumber, reason },
    });

    // Advance to INITIATED
    await this.repo.updateStatus(refund._id.toString(), RefundStatus.RETRY_PENDING, RefundStatus.INITIATED);

    return await this.initiateProviderRefund(refund._id.toString(), actorId);
  }

  /**
   * Reconciles a refund against the payment provider.
   */
  async reconcileRefund(refundId: string, actorId: string) {
    const result = await this.reconciliationService.reconcileRefund(refundId, actorId);

    await this.logAudit({
      actorId,
      actorType: AuditActorType.STAFF,
      action: "REFUND_RECONCILED",
      entityId: refundId,
      metadata: {
        refundNumber: result.refundNumber,
        previousStatus: result.previousStatus,
        currentStatus: result.currentStatus,
        mismatchDetected: result.mismatchDetected,
      },
    });

    return result;
  }

  /**
   * Handles payment provider refund webhooks (reusing Phase 18 HMAC verification).
   */
  async handleRefundWebhook(params: { rawPayload: string; signature: string }) {
    const verification = await this.provider.verifyWebhook(params);
    if (!verification.verified || !verification.event) {
      logger.warn("Refund webhook signature verification failed", {
        context: "RefundService.handleRefundWebhook",
        metadata: { reason: verification.reason },
      });
      throw new AppError("Invalid webhook signature", "INVALID_WEBHOOK_SIGNATURE", 400);
    }

    const event = verification.event as {
      event?: string;
      payload?: {
        refund?: {
          entity?: {
            id?: string;
            payment_id?: string;
            amount?: number;
            status?: string;
            receipt?: string;
          };
        };
      };
    };

    const eventType = event.event;
    const refundEntity = event.payload?.refund?.entity;

    if (!refundEntity || !refundEntity.id) {
      // Not a refund webhook event; ignore gracefully
      return { handled: false, message: "Ignored non-refund webhook payload" };
    }

    logger.info("Processing verified refund webhook", {
      context: "RefundService.handleRefundWebhook",
      metadata: { eventType, providerRefundId: refundEntity.id, status: refundEntity.status },
    });

    // Lookup refund by providerRefundId or receipt (refundNumber)
    let refund = await this.repo.findByProviderRefundId(refundEntity.id);
    if (!refund && refundEntity.receipt) {
      refund = await this.repo.findByRefundNumber(refundEntity.receipt);
    }

    if (!refund) {
      logger.warn("Webhook received for unknown refund record", {
        context: "RefundService.handleRefundWebhook",
        metadata: { providerRefundId: refundEntity.id, receipt: refundEntity.receipt },
      });
      return { handled: true, message: "Webhook acknowledged; refund not registered in store." };
    }

    // Idempotency: If already completed and event is refund.processed, return without side-effects
    if (refund.status === RefundStatus.COMPLETED && eventType === "refund.processed") {
      return { handled: true, message: "Webhook already processed" };
    }

    const canonicalStatus = RefundStatusMapper.fromProviderStatus(refundEntity.status);

    if (canonicalStatus === RefundStatus.COMPLETED) {
      await this.repo.updateById(refund._id.toString(), {
        status: RefundStatus.COMPLETED,
        providerRefundId: refundEntity.id,
        completedAt: new Date(),
        processedAt: new Date(),
      });

      await this.logAudit({
        actorId: "WEBHOOK",
        actorType: AuditActorType.SYSTEM,
        action: "REFUND_WEBHOOK_COMPLETED",
        entityId: refund._id.toString(),
        metadata: { refundNumber: refund.refundNumber, providerRefundId: refundEntity.id },
      });
    } else if (canonicalStatus === RefundStatus.FAILED) {
      await this.repo.updateById(refund._id.toString(), {
        status: RefundStatus.FAILED,
        providerRefundId: refundEntity.id,
        failedAt: new Date(),
        failureCode: "WEBHOOK_REPORTED_FAILURE",
        failureMessage: "Payment provider notified refund failure via webhook",
      });

      await this.logAudit({
        actorId: "WEBHOOK",
        actorType: AuditActorType.SYSTEM,
        action: "REFUND_WEBHOOK_FAILED",
        entityId: refund._id.toString(),
        metadata: { refundNumber: refund.refundNumber, providerRefundId: refundEntity.id },
      });
    }

    return { handled: true, refundNumber: refund.refundNumber, status: canonicalStatus };
  }

  /**
   * Returns paginated customer refund history (Strict Anti-IDOR).
   */
  async getCustomerRefunds(
    customerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ refunds: CustomerRefundDTO[]; total: number }> {
    const { refunds, total } = await this.repo.findByCustomerId(customerId, options);

    const dtos: CustomerRefundDTO[] = refunds.map((r) => this.mapToCustomerDTO(r));
    return { refunds: dtos, total };
  }

  /**
   * Returns customer refund details with visual timeline (Strict Anti-IDOR).
   */
  async getCustomerRefundDetail(
    refundNumber: string,
    customerId: string
  ): Promise<CustomerRefundDetailDTO> {
    const refund = await this.repo.findByRefundNumber(refundNumber);
    if (!refund) {
      throw new NotFoundError("Refund not found");
    }

    if (refund.customerId.toString() !== customerId) {
      throw new AppError("Access denied to requested refund", "UNAUTHORIZED", 403);
    }

    return this.mapToCustomerDetailDTO(refund);
  }

  /**
   * Returns admin refund list with pagination and metrics.
   */
  async getAdminRefunds(filters: AdminRefundQueryFilters) {
    const [{ refunds, total }, statusCounts] = await Promise.all([
      this.repo.listAdminRefunds(filters),
      this.repo.countRefundsByStatus(),
    ]);

    // Batch load customer details to avoid N+1 queries (Section 80)
    const customerIds = [...new Set(refunds.map((r) => r.customerId.toString()))];
    const customers = await CustomerModel.find({ _id: { $in: customerIds } })
      .select({ firstName: 1, lastName: 1, email: 1 })
      .lean();

    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    const dtos: AdminRefundDTO[] = refunds.map((r) => {
      const cust = customerMap.get(r.customerId.toString());
      return {
        id: r._id.toString(),
        refundNumber: r.refundNumber,
        orderId: r.orderId.toString(),
        orderNumber: r.orderNumber,
        paymentId: r.paymentId.toString(),
        customerId: r.customerId.toString(),
        customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : undefined,
        customerEmail: cust?.email,
        returnRequestId: r.returnRequestId?.toString(),
        amountMinor: r.amount,
        currency: r.currency,
        reason: r.reason,
        type: r.type,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        status: r.status,
        provider: r.provider,
        providerRefundId: r.providerRefundId,
        initiatedBy: r.initiatedBy,
        approvedBy: r.approvedBy,
        calculationSnapshot: r.calculationSnapshot,
        attempts: r.attempts || [],
        reconciliationState: r.reconciliationState,
        failureCode: r.failureCode,
        failureMessage: r.failureMessage,
        notes: r.notes,
        initiatedAt: r.initiatedAt ? new Date(r.initiatedAt).toISOString() : undefined,
        processedAt: r.processedAt ? new Date(r.processedAt).toISOString() : undefined,
        completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
        failedAt: r.failedAt ? new Date(r.failedAt).toISOString() : undefined,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      };
    });

    return {
      refunds: dtos,
      total,
      page: Math.max(1, filters.page || 1),
      limit: Math.max(1, Math.min(100, filters.limit || 20)),
      statusCounts,
    };
  }

  /**
   * Returns privileged single refund detail for admin console.
   */
  async getAdminRefundDetail(id: string): Promise<AdminRefundDTO> {
    const refund = await this.repo.findById(id);
    if (!refund) {
      throw new NotFoundError("Refund not found");
    }

    const cust = await CustomerModel.findById(refund.customerId)
      .select({ firstName: 1, lastName: 1, email: 1 })
      .lean();

    return {
      id: refund._id.toString(),
      refundNumber: refund.refundNumber,
      orderId: refund.orderId.toString(),
      orderNumber: refund.orderNumber,
      paymentId: refund.paymentId.toString(),
      customerId: refund.customerId.toString(),
      customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : undefined,
      customerEmail: cust?.email,
      returnRequestId: refund.returnRequestId?.toString(),
      amountMinor: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      type: refund.type,
      sourceType: refund.sourceType,
      sourceId: refund.sourceId,
      status: refund.status,
      provider: refund.provider,
      providerRefundId: refund.providerRefundId,
      initiatedBy: refund.initiatedBy,
      approvedBy: refund.approvedBy,
      calculationSnapshot: refund.calculationSnapshot,
      attempts: refund.attempts || [],
      reconciliationState: refund.reconciliationState,
      failureCode: refund.failureCode,
      failureMessage: refund.failureMessage,
      notes: refund.notes,
      initiatedAt: refund.initiatedAt ? new Date(refund.initiatedAt).toISOString() : undefined,
      processedAt: refund.processedAt ? new Date(refund.processedAt).toISOString() : undefined,
      completedAt: refund.completedAt ? new Date(refund.completedAt).toISOString() : undefined,
      failedAt: refund.failedAt ? new Date(refund.failedAt).toISOString() : undefined,
      createdAt: new Date(refund.createdAt).toISOString(),
      updatedAt: new Date(refund.updatedAt).toISOString(),
    };
  }

  // --- Helper Methods ---

  private async markRefundFailed(
    refundId: string,
    failureCode: string,
    failureMessage: string,
    attemptId?: string
  ): Promise<void> {
    await this.repo.updateById(refundId, {
      status: RefundStatus.FAILED,
      failureCode,
      failureMessage,
      failedAt: new Date(),
    });

    if (attemptId) {
      await this.updateAttemptResult(refundId, attemptId, {
        status: RefundAttemptStatus.FAILED,
        errorCode: failureCode,
        errorMessage: failureMessage,
        completedAt: new Date(),
      });
    }
  }

  private async updateAttemptResult(
    refundId: string,
    attemptId: string,
    updates: Partial<IRefundAttempt>
  ): Promise<void> {
    const refund = await this.repo.findById(refundId);
    if (!refund) return;

    const attempts = (refund.attempts || []).map((att) => {
      if (att.attemptId === attemptId) {
        return { ...att, ...updates };
      }
      return att;
    });

    await this.repo.updateById(refundId, { attempts });
  }

  private mapToCustomerDTO(r: IRefund): CustomerRefundDTO {
    return {
      refundNumber: r.refundNumber,
      orderNumber: r.orderNumber || "ORDER",
      type: r.type,
      amountMinor: r.amount,
      currency: r.currency,
      status: r.status,
      reason: r.reason,
      initiatedAt: r.initiatedAt
        ? new Date(r.initiatedAt).toISOString()
        : new Date(r.createdAt).toISOString(),
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
    };
  }

  private mapToCustomerDetailDTO(r: IRefund): CustomerRefundDetailDTO {
    const base = this.mapToCustomerDTO(r);

    const timeline = [
      {
        status: RefundStatus.REQUESTED,
        label: "Refund Requested",
        timestamp: new Date(r.createdAt).toISOString(),
        completed: true,
      },
      {
        status: RefundStatus.ELIGIBLE,
        label: "Refund Approved & Verified",
        timestamp: r.initiatedAt ? new Date(r.initiatedAt).toISOString() : undefined,
        completed: ([
          RefundStatus.ELIGIBLE,
          RefundStatus.INITIATED,
          RefundStatus.PROCESSING,
          RefundStatus.COMPLETED,
        ] as RefundStatus[]).includes(r.status),
      },
      {
        status: RefundStatus.INITIATED,
        label: "Dispatched to Payment Gateway",
        timestamp: r.initiatedAt ? new Date(r.initiatedAt).toISOString() : undefined,
        completed: ([
          RefundStatus.INITIATED,
          RefundStatus.PROCESSING,
          RefundStatus.COMPLETED,
        ] as RefundStatus[]).includes(r.status),
      },
      {
        status: RefundStatus.PROCESSING,
        label: "Processing by Bank / Gateway",
        timestamp: r.processedAt ? new Date(r.processedAt).toISOString() : undefined,
        completed: ([RefundStatus.PROCESSING, RefundStatus.COMPLETED] as RefundStatus[]).includes(r.status),
      },
      {
        status: RefundStatus.COMPLETED,
        label: "Refund Credited / Completed",
        timestamp: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
        completed: r.status === RefundStatus.COMPLETED,
      },
    ];

    let items: CustomerRefundDTO["items"];
    if (r.calculationSnapshot?.items && r.calculationSnapshot.items.length > 0) {
      items = r.calculationSnapshot.items.map((item) => ({
        productName: `Item (${item.orderItemId.slice(-6)})`,
        quantity: item.quantity,
        amountMinor: item.itemRefundAmount,
      }));
    }

    return {
      ...base,
      items,
      timeline,
    };
  }

  private async logAudit(params: {
    actorId: string;
    actorType: AuditActorType;
    action: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await AuditLogModel.create({
        actorId: params.actorId,
        actorType: params.actorType,
        action: params.action,
        entityType: "REFUND",
        entityId: params.entityId,
        metadata: params.metadata || {},
      });
    } catch (err) {
      logger.warn("Failed to create refund audit log entry", {
        context: "RefundService.logAudit",
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }
}

export const refundService = new RefundService();
