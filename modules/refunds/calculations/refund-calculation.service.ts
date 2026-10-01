/**
 * VÉRONA — Refund Calculation Engine
 *
 * Implements authoritative financial calculation for full and partial refunds.
 * - Enforces integer minor units (paise) with zero floating-point arithmetic.
 * - Uses immutable historical order snapshots (never today's catalog/coupon prices).
 * - Accurately distributes item-level discounts, coupons, and taxes.
 * - Enforces shipping refund policy:
 *   - Cancellations before fulfillment: shipping refundable
 *   - Returns after delivery: shipping non-refundable (unless explicitly authorized)
 * - Invariant: sum(successfulRefunds) <= capturedAmount.
 */

import { ValidationError, AppError } from "@/lib/errors";
import { MinorUnits, IRefundCalculationSnapshot } from "@/types/database";
import { RefundSourceType } from "@/constants/status";
import {
  RefundCalculationInput,
  RefundCalculationResult,
} from "../types/refund.types";

/**
 * Centralized business policy for shipping refunds.
 */
export const REFUND_SHIPPING_POLICY = {
  REFUND_SHIPPING_ON_CANCELLATION: true,
  REFUND_SHIPPING_ON_RETURN: false,
} as const;

export class RefundCalculationService {
  /**
   * Calculates the exact refundable amount and creates an immutable snapshot.
   */
  calculateRefund(input: RefundCalculationInput): RefundCalculationResult {
    const {
      orderPricing,
      orderItems,
      paidAmountMinor,
      previouslyRefundedMinor,
      itemsToRefund,
      customAdjustmentMinor,
      sourceType,
    } = input;

    // Financial invariant 1: Non-negative historical balances
    if (paidAmountMinor < 0 || previouslyRefundedMinor < 0) {
      throw new ValidationError("Payment amounts and previous refunds must not be negative");
    }

    const remainingRefundableBefore: MinorUnits = paidAmountMinor - previouslyRefundedMinor;

    if (remainingRefundableBefore <= 0) {
      throw new AppError(
        "No refundable balance remaining on this captured payment",
        "REFUND_AMOUNT_EXCEEDS_REMAINING",
        400
      );
    }

    // Determine default shipping refund policy if not explicitly overridden
    const shouldRefundShipping =
      typeof input.refundShipping === "boolean"
        ? input.refundShipping
        : sourceType === RefundSourceType.ORDER_CANCELLATION
        ? REFUND_SHIPPING_POLICY.REFUND_SHIPPING_ON_CANCELLATION
        : REFUND_SHIPPING_POLICY.REFUND_SHIPPING_ON_RETURN;

    // 1. Manual Admin Adjustment Path
    if (typeof customAdjustmentMinor === "number") {
      if (!Number.isInteger(customAdjustmentMinor) || customAdjustmentMinor <= 0) {
        throw new ValidationError("Manual refund amount must be an integer minor unit greater than zero");
      }
      if (customAdjustmentMinor > remainingRefundableBefore) {
        throw new AppError(
          `Refund amount (₹${(customAdjustmentMinor / 100).toFixed(2)}) exceeds remaining refundable balance (₹${(remainingRefundableBefore / 100).toFixed(2)})`,
          "REFUND_AMOUNT_EXCEEDS_REMAINING",
          400
        );
      }

      const snapshot: IRefundCalculationSnapshot = {
        originalSubtotal: orderPricing.subtotal,
        originalDiscount: orderPricing.discount,
        originalCouponDiscount: orderPricing.couponDiscount || 0,
        originalTax: orderPricing.tax,
        originalShipping: orderPricing.shipping,
        originalTotal: orderPricing.total,
        paidAmount: paidAmountMinor,
        previouslyRefundedAmount: previouslyRefundedMinor,
        remainingRefundableBefore,
        itemsRefundSubtotal: 0,
        discountDeduction: 0,
        taxRefund: 0,
        shippingRefund: 0,
        finalRefundAmount: customAdjustmentMinor,
        policyNotes: `Manual authorized adjustment for ${input.reason || "Administrative correction"}`,
      };

      return {
        calculationSnapshot: snapshot,
        finalRefundAmountMinor: customAdjustmentMinor,
        refundableRemainingAfter: remainingRefundableBefore - customAdjustmentMinor,
        isFullRefund: remainingRefundableBefore - customAdjustmentMinor === 0,
      };
    }

    // 2. Item-Level Partial or Full Item Return
    if (itemsToRefund && itemsToRefund.length > 0) {
      let itemsSubtotal: MinorUnits = 0;
      let totalDiscountDeduction: MinorUnits = 0;
      let totalTaxRefund: MinorUnits = 0;
      let calculatedItemTotalRefund: MinorUnits = 0;

      const itemSnapshots: NonNullable<IRefundCalculationSnapshot["items"]> = [];

      for (const reqItem of itemsToRefund) {
        const orderItem = orderItems.find(
          (oi) =>
            oi.orderItemId === reqItem.orderItemId ||
            (oi as unknown as { _id?: { toString(): string } })._id?.toString() === reqItem.orderItemId ||
            oi.variantId === reqItem.orderItemId ||
            oi.sku === reqItem.orderItemId
        );

        if (!orderItem) {
          throw new ValidationError(`Order item ${reqItem.orderItemId} not found in order snapshots`);
        }

        if (reqItem.quantity <= 0) {
          throw new ValidationError("Item refund quantity must be greater than zero");
        }

        if (reqItem.quantity > orderItem.quantity) {
          throw new ValidationError(
            `Requested refund quantity (${reqItem.quantity}) exceeds ordered quantity (${orderItem.quantity}) for ${orderItem.productName}`
          );
        }

        // Calculate proportional financial distribution per unit
        // finalPrice in orderItem already represents paid amount after discount + tax
        const itemQuantity = orderItem.quantity;
        const refundQuantity = reqItem.quantity;

        const proportionalPaid = Math.floor((orderItem.finalPrice * refundQuantity) / itemQuantity);
        const proportionalDiscount = Math.floor((orderItem.discount * refundQuantity) / itemQuantity);
        const proportionalTax = Math.floor((orderItem.tax * refundQuantity) / itemQuantity);
        const itemGross = orderItem.unitPrice * refundQuantity;

        itemsSubtotal += itemGross;
        totalDiscountDeduction += proportionalDiscount;
        totalTaxRefund += proportionalTax;
        calculatedItemTotalRefund += proportionalPaid;

        itemSnapshots.push({
          orderItemId: reqItem.orderItemId,
          variantId: orderItem.variantId,
          quantity: refundQuantity,
          unitPrice: orderItem.unitPrice,
          discountAllocation: proportionalDiscount,
          taxAllocation: proportionalTax,
          itemRefundAmount: proportionalPaid,
        });
      }

      const shippingRefund: MinorUnits = shouldRefundShipping ? orderPricing.shipping : 0;
      let finalRefundAmount: MinorUnits = calculatedItemTotalRefund + shippingRefund;

      // Invariant: Cannot refund more than remaining refundable
      if (finalRefundAmount > remainingRefundableBefore) {
        // Cap or reject based on invariant
        if (calculatedItemTotalRefund <= remainingRefundableBefore) {
          // If shipping pushed it over, reduce shipping
          finalRefundAmount = remainingRefundableBefore;
        } else {
          throw new AppError(
            `Calculated refund amount exceeds remaining refundable amount (${remainingRefundableBefore})`,
            "REFUND_AMOUNT_EXCEEDS_REMAINING",
            400
          );
        }
      }

      const snapshot: IRefundCalculationSnapshot = {
        originalSubtotal: orderPricing.subtotal,
        originalDiscount: orderPricing.discount,
        originalCouponDiscount: orderPricing.couponDiscount || 0,
        originalTax: orderPricing.tax,
        originalShipping: orderPricing.shipping,
        originalTotal: orderPricing.total,
        paidAmount: paidAmountMinor,
        previouslyRefundedAmount: previouslyRefundedMinor,
        remainingRefundableBefore,
        itemsRefundSubtotal: itemsSubtotal,
        discountDeduction: totalDiscountDeduction,
        taxRefund: totalTaxRefund,
        shippingRefund,
        finalRefundAmount,
        policyNotes: `Item-level refund for ${itemsToRefund.length} item(s). Shipping ${shouldRefundShipping ? "included" : "excluded"}.`,
        items: itemSnapshots,
      };

      return {
        calculationSnapshot: snapshot,
        finalRefundAmountMinor: finalRefundAmount,
        refundableRemainingAfter: remainingRefundableBefore - finalRefundAmount,
        isFullRefund: remainingRefundableBefore - finalRefundAmount === 0,
      };
    }

    // 3. Full Order Refund (e.g. Total Cancellation)
    const shippingRefund: MinorUnits = shouldRefundShipping ? orderPricing.shipping : 0;
    const computedFullRefund = orderPricing.total - (shouldRefundShipping ? 0 : orderPricing.shipping);
    const finalRefundAmount: MinorUnits = Math.min(computedFullRefund, remainingRefundableBefore);

    const snapshot: IRefundCalculationSnapshot = {
      originalSubtotal: orderPricing.subtotal,
      originalDiscount: orderPricing.discount,
      originalCouponDiscount: orderPricing.couponDiscount || 0,
      originalTax: orderPricing.tax,
      originalShipping: orderPricing.shipping,
      originalTotal: orderPricing.total,
      paidAmount: paidAmountMinor,
      previouslyRefundedAmount: previouslyRefundedMinor,
      remainingRefundableBefore,
      itemsRefundSubtotal: orderPricing.subtotal,
      discountDeduction: orderPricing.discount + (orderPricing.couponDiscount || 0),
      taxRefund: orderPricing.tax,
      shippingRefund,
      finalRefundAmount,
      policyNotes: `Full order refund. Shipping ${shouldRefundShipping ? "included" : "excluded"}.`,
    };

    return {
      calculationSnapshot: snapshot,
      finalRefundAmountMinor: finalRefundAmount,
      refundableRemainingAfter: remainingRefundableBefore - finalRefundAmount,
      isFullRefund: remainingRefundableBefore - finalRefundAmount === 0,
    };
  }
}

export const refundCalculationService = new RefundCalculationService();
