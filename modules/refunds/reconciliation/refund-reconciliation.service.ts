/**
 * VÉRONA — Refund Reconciliation Service
 *
 * Single source of truth for resolving ambiguous refund states, gateway timeouts,
 * delayed webhooks, and provider/internal state mismatches.
 *
 * Invariant: Never blindly re-attempts provider dispatch when state is unknown.
 * Queries provider authoritative GET /refunds/:id before performing synchronization.
 */

import { IPaymentProvider } from "@/modules/payments/types/payment.types";
import { razorpayPaymentProvider } from "@/modules/payments/providers/razorpay.provider";
import { RefundStatus } from "@/constants/status";
import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RefundRepository, refundRepository } from "../repositories/refund.repository";
import {
  RefundStatusMapper,
  assertValidRefundTransition,
} from "../state-machine/refund-state-machine";

export interface ReconciliationResult {
  refundId: string;
  refundNumber: string;
  previousStatus: RefundStatus;
  currentStatus: RefundStatus;
  providerStatus: string;
  mismatchDetected: boolean;
  notes: string;
}

export class RefundReconciliationService {
  constructor(
    private readonly repo: RefundRepository = refundRepository,
    private readonly provider: IPaymentProvider = razorpayPaymentProvider
  ) {}

  /**
   * Reconciles a single refund against the external payment provider.
   */
  async reconcileRefund(
    refundId: string,
    actorId: string = "SYSTEM"
  ): Promise<ReconciliationResult> {
    const refund = await this.repo.findById(refundId);
    if (!refund) {
      throw new NotFoundError("Refund not found for reconciliation");
    }

    if (!refund.providerRefundId) {
      // If no provider refund ID exists, provider call never returned an ID
      // If state is INITIATED or RECONCILIATION_REQUIRED, we flag that provider check cannot proceed
      throw new AppError(
        "Refund has no provider refund ID. Provider lookup requires an active gateway reference.",
        "REFUND_RECONCILIATION_REQUIRED",
        400
      );
    }

    logger.info("Starting refund reconciliation", {
      context: "RefundReconciliationService.reconcileRefund",
      metadata: {
        refundId: refund._id.toString(),
        refundNumber: refund.refundNumber,
        providerRefundId: refund.providerRefundId,
        currentStatus: refund.status,
      },
    });

    // 1. Query Gateway directly
    if (!this.provider.getRefund) {
      throw new AppError("Payment provider does not support refund lookup", "PROVIDER_NOT_CONFIGURED", 501);
    }
    const gatewayRefund = await this.provider.getRefund(refund.providerRefundId);
    const targetCanonicalStatus = RefundStatusMapper.fromProviderStatus(gatewayRefund.status);

    const previousStatus = refund.status;
    let mismatchDetected = false;
    let notes = `Gateway reported status: '${gatewayRefund.status}' -> canonical: '${targetCanonicalStatus}'.`;

    // 2. Conflict & Mismatch Analysis
    if (previousStatus === RefundStatus.FAILED && targetCanonicalStatus === RefundStatus.COMPLETED) {
      // High-priority mismatch: We thought it failed, but gateway succeeded!
      mismatchDetected = true;
      notes += " CRITICAL: Mismatch detected. Local state was FAILED, but gateway confirmed COMPLETED.";
      logger.warn("Refund reconciliation mismatch: Local FAILED vs Gateway COMPLETED", {
        context: "RefundReconciliationService",
        metadata: { refundNumber: refund.refundNumber, providerRefundId: refund.providerRefundId },
      });
    }

    // 3. State Transition Handling
    if (previousStatus !== targetCanonicalStatus) {
      // Validate transition if not an emergency override
      if (canBypassForReconciliation(previousStatus, targetCanonicalStatus)) {
        // Safe sync
      } else {
        assertValidRefundTransition(previousStatus, targetCanonicalStatus);
      }

      const updates: Record<string, unknown> = {
        status: targetCanonicalStatus,
        reconciliationState: {
          lastCheckedAt: new Date(),
          providerStatus: gatewayRefund.status,
          mismatchDetected,
          notes,
        },
      };

      if (targetCanonicalStatus === RefundStatus.COMPLETED) {
        updates.completedAt = new Date();
        updates.processedAt = new Date();
      } else if (targetCanonicalStatus === RefundStatus.FAILED) {
        updates.failedAt = new Date();
      }

      await this.repo.updateById(refund._id.toString(), updates);
    } else {
      // Status matches, just record check timestamp
      await this.repo.updateReconciliation(refund._id.toString(), {
        lastCheckedAt: new Date(),
        providerStatus: gatewayRefund.status,
        mismatchDetected,
        notes: "Status in sync with payment gateway.",
      });
    }

    logger.info("Refund reconciliation completed", {
      context: "RefundReconciliationService.reconcileRefund",
      metadata: {
        refundNumber: refund.refundNumber,
        previousStatus,
        currentStatus: targetCanonicalStatus,
        mismatchDetected,
        actorId,
      },
    });

    return {
      refundId: refund._id.toString(),
      refundNumber: refund.refundNumber,
      previousStatus,
      currentStatus: targetCanonicalStatus,
      providerStatus: gatewayRefund.status,
      mismatchDetected,
      notes,
    };
  }
}

function canBypassForReconciliation(from: RefundStatus, to: RefundStatus): boolean {
  // Allow reconciliation sync from FAILED or RECONCILIATION_REQUIRED to COMPLETED
  if (from === RefundStatus.RECONCILIATION_REQUIRED && to === RefundStatus.COMPLETED) return true;
  if (from === RefundStatus.RECONCILIATION_REQUIRED && to === RefundStatus.FAILED) return true;
  if (from === RefundStatus.FAILED && to === RefundStatus.COMPLETED) return true;
  return false;
}

export const refundReconciliationService = new RefundReconciliationService();
