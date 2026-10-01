/**
 * VÉRONA — Refund Eligibility Service
 *
 * Single source of truth for validating refund eligibility across:
 * - Payment capture status (rejects unpaid/pending/failed payments)
 * - Cumulative refund balances (sum of refunds <= captured amount)
 * - Return settlement verification (Phase 22 boundary validation)
 * - Anti-IDOR customer ownership verification
 * - Duplicate refund prevention (idempotency by return / cancellation source)
 */

import { OrderModel, PaymentModel, ReturnRequestModel } from "@/db/models";
import { PaymentStatus, ReturnStatus, RefundSourceType, RefundStatus } from "@/constants/status";
import { IOrder, IPayment, IReturnRequest, MinorUnits } from "@/types/database";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import { RefundRepository, refundRepository } from "../repositories/refund.repository";

export interface VerifiedRefundEligibility {
  isEligible: boolean;
  order: IOrder;
  payment: IPayment;
  returnRequest?: IReturnRequest;
  capturedAmountMinor: MinorUnits;
  previouslyRefundedMinor: MinorUnits;
  remainingRefundableMinor: MinorUnits;
  currency: string;
}

export class RefundEligibilityService {
  constructor(private readonly repo: RefundRepository = refundRepository) {}

  /**
   * Asserts refund eligibility and returns verified domain snapshots.
   */
  async evaluateEligibility(params: {
    orderId: string;
    customerId?: string;
    sourceType: RefundSourceType;
    sourceId?: string;
    returnRequestId?: string;
  }): Promise<VerifiedRefundEligibility> {
    const { customerId, sourceType } = params;
    let effectiveOrderId = params.orderId;
    let returnRequest: IReturnRequest | undefined;

    const effectiveReturnId =
      params.returnRequestId ||
      (sourceType === RefundSourceType.RETURN ? params.sourceId : undefined);

    if (effectiveReturnId) {
      const ret = (await ReturnRequestModel.findById(effectiveReturnId).lean()) as IReturnRequest | null;
      if (!ret) {
        throw new NotFoundError("Associated return request not found");
      }
      returnRequest = ret;
      if (!effectiveOrderId) {
        effectiveOrderId = ret.orderId.toString();
      }
    }

    if (!effectiveOrderId) {
      throw new ValidationError("Order ID is required for refund evaluation");
    }

    // 1. Order Verification
    const order = (await OrderModel.findById(effectiveOrderId).lean()) as IOrder | null;
    if (!order) {
      throw new NotFoundError("Order not found for refund evaluation");
    }

    if (customerId && order.customerId.toString() !== customerId) {
      throw new AppError("Access denied to order refund evaluation", "UNAUTHORIZED", 403);
    }

    // 2. Authoritative Payment Verification (Phase 18)
    const payment = await this.findAuthoritativeCapturedPayment(order);
    if (!payment) {
      throw new AppError(
        "No captured or settled payment found for this order. Unpaid orders cannot be refunded.",
        "PAYMENT_NOT_CAPTURED",
        400
      );
    }

    // Validate payment capture status
    const validCaptureStatuses: PaymentStatus[] = [PaymentStatus.CAPTURED];
    if (!validCaptureStatuses.includes(payment.status)) {
      throw new AppError(
        `Payment status ${payment.status} is not eligible for refund. Payment must be captured.`,
        "PAYMENT_NOT_CAPTURED",
        400
      );
    }

    // 3. Currency Validation
    const currency = payment.currency || "INR";
    if (currency !== "INR") {
      throw new ValidationError(`Unsupported payment currency: ${currency}. Only INR refunds supported.`);
    }

    // 4. Return Request Boundary Validation (if Return-driven)
    if (returnRequest) {
      if (returnRequest.orderId.toString() !== order._id.toString()) {
        throw new ValidationError("Return request does not belong to specified order");
      }

      if (customerId && returnRequest.customerId.toString() !== customerId) {
        throw new AppError("Access denied to return request", "UNAUTHORIZED", 403);
      }

      // Return must be approved for settlement
      const eligibleReturnStatuses = [
        ReturnStatus.APPROVED_FOR_SETTLEMENT,
        ReturnStatus.APPROVED_FOR_REFUND,
        ReturnStatus.COMPLETED,
      ] as ReturnStatus[];
      if (!eligibleReturnStatuses.includes(returnRequest.status)) {
        throw new AppError(
          `Return request status ${returnRequest.status} is not approved for settlement`,
          "REFUND_NOT_ELIGIBLE",
          400
        );
      }

      // Duplicate settlement protection (Section 88)
      const existingRefund = await this.repo.findByReturnRequestId(returnRequest._id.toString());
      if (existingRefund && existingRefund.status !== RefundStatus.FAILED) {
        throw new AppError(
          `A refund (${existingRefund.refundNumber}) is already associated with return ${returnRequest.returnNumber}`,
          "DUPLICATE_SETTLEMENT_REFUND",
          409
        );
      }
    }

    // 5. Cumulative Refund Protection
    const paymentId = payment._id.toString();
    const existingRefunds = await this.repo.getCommittedRefundsForPayment(paymentId);

    const previouslyRefundedMinor = existingRefunds.reduce(
      (sum, r) => sum + r.amount,
      0
    );

    const capturedAmountMinor = payment.amount;
    const remainingRefundableMinor = capturedAmountMinor - previouslyRefundedMinor;

    if (remainingRefundableMinor <= 0) {
      throw new AppError(
        "Order has already been fully refunded. Remaining refundable balance is ₹0.",
        "PAYMENT_NOT_REFUNDABLE",
        400
      );
    }

    return {
      isEligible: true,
      order,
      payment,
      returnRequest,
      capturedAmountMinor,
      previouslyRefundedMinor,
      remainingRefundableMinor,
      currency,
    };
  }

  /**
   * Identifies the authoritative successful payment for an order.
   * If multiple attempts occurred, selects the captured/settled one.
   */
  private async findAuthoritativeCapturedPayment(order: IOrder): Promise<IPayment | null> {
    if (order.paymentId) {
      const payment = (await PaymentModel.findById(order.paymentId).lean()) as IPayment | null;
      if (payment) return payment;
    }

    // Fallback: Find successful payment by orderId
    const successfulPayment = (await PaymentModel.findOne({
      orderId: order._id,
      status: PaymentStatus.CAPTURED,
    })
      .sort({ createdAt: -1 })
      .lean()) as IPayment | null;

    if (successfulPayment) return successfulPayment;

    // Fallback: If order has checkoutSessionId, search by checkoutSessionId
    if (order.checkoutSessionId) {
      const sessionPayment = (await PaymentModel.findOne({
        checkoutSessionId: order.checkoutSessionId,
        status: PaymentStatus.CAPTURED,
      })
        .sort({ createdAt: -1 })
        .lean()) as IPayment | null;

      if (sessionPayment) return sessionPayment;
    }

    return null;
  }
}

export const refundEligibilityService = new RefundEligibilityService();
