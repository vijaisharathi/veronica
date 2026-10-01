/**
 * VÉRONA — Return Eligibility Service (Phase 22)
 *
 * Authoritative evaluation layer for order and item return eligibility.
 * Enforces:
 * - Order delivery status and delivery date bounds
 * - Return window adherence
 * - Product returnability and final-sale rules
 * - Strict cumulative quantity limits across multiple return requests
 * - Anti-IDOR customer ownership verification
 */

import { returnPolicyService } from "../policies/return-policy.service";
import { OrderModel, ProductModel, ReturnRequestModel, ShipmentModel } from "@/db/models";
import { ReturnStatus, OrderStatus } from "@/constants/status";
import {
  OrderEligibilityResult,
  ItemEligibilityResult,
  CreateReturnItemInput,
} from "../types/return.types";
import { NotFoundError, AuthorizationError, ValidationError } from "@/lib/errors";

export class ReturnEligibilityService {
  /**
   * Evaluate full order and item return eligibility.
   */
  async evaluateOrderEligibility(
    orderId: string,
    customerId?: string
  ): Promise<OrderEligibilityResult> {
    const order = await OrderModel.findById(orderId).lean();
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    if (customerId && order.customerId.toString() !== customerId) {
      throw new AuthorizationError("You do not have permission to access returns for this order.");
    }

    const isDelivered = order.status === OrderStatus.DELIVERED;
    const shipments = await ShipmentModel.find({ orderId: order._id }).lean();
    const deliveredAt = returnPolicyService.resolveDeliveryDate(order as any, shipments as any);

    const returnWindowDays = returnPolicyService.getReturnWindowDays();
    const windowExpiresAt = deliveredAt
      ? returnPolicyService.calculateWindowExpiry(deliveredAt, returnWindowDays)
      : null;

    const isWithinWindow = Boolean(
      isDelivered && deliveredAt && returnPolicyService.isWithinReturnWindow(deliveredAt, returnWindowDays)
    );

    // Fetch existing active or completed returns to calculate cumulative quantities
    const existingReturns = await ReturnRequestModel.find({
      orderId: order._id,
      status: { $nin: [ReturnStatus.REJECTED, ReturnStatus.CANCELLED] },
    }).lean();

    const cumulativeQuantityMap = new Map<string, number>();
    for (const ret of existingReturns) {
      for (const item of ret.items) {
        const prev = cumulativeQuantityMap.get(item.orderItemId) || 0;
        cumulativeQuantityMap.set(item.orderItemId, prev + item.quantity);
      }
    }

    // Batch fetch products for returnability checks
    const productIds = Array.from(new Set(order.items.map((i) => i.productId.toString())));
    const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items: ItemEligibilityResult[] = [];
    let hasAnyEligibleItem = false;

    for (const orderItem of order.items) {
      const orderItemId = (orderItem as any)._id ? (orderItem as any)._id.toString() : "";
      const product = productMap.get(orderItem.productId.toString());

      const productReturnability = returnPolicyService.evaluateProductReturnability({
        isReturnable: (product as any)?.isReturnable ?? true,
        isFinalSale: (product as any)?.isFinalSale ?? false,
      });

      const alreadyReturned = cumulativeQuantityMap.get(orderItemId) || 0;
      const remainingReturnableQuantity = Math.max(0, orderItem.quantity - alreadyReturned);

      let isEligible = false;
      let ineligibleReason: string | undefined;

      if (!isDelivered) {
        ineligibleReason = "Item cannot be returned until order has been delivered.";
      } else if (!isWithinWindow) {
        ineligibleReason = `Return window of ${returnWindowDays} days has expired.`;
      } else if (!productReturnability.allowed) {
        ineligibleReason = productReturnability.reason;
      } else if (remainingReturnableQuantity <= 0) {
        ineligibleReason = "All purchased units of this item have already been returned or requested.";
      } else {
        isEligible = true;
        hasAnyEligibleItem = true;
      }

      items.push({
        orderItemId,
        variantId: orderItem.variantId.toString(),
        productId: orderItem.productId.toString(),
        productName: orderItem.productName,
        orderedQuantity: orderItem.quantity,
        alreadyReturnedQuantity: alreadyReturned,
        remainingReturnableQuantity,
        unitPriceMinor: orderItem.finalPrice ?? orderItem.unitPrice,
        isReturnable: productReturnability.allowed,
        isFinalSale: Boolean((product as any)?.isFinalSale),
        isEligible,
        ineligibleReason,
      });
    }

    let orderIneligibleReason: string | undefined;
    if (!isDelivered) {
      orderIneligibleReason = "Returns are only accepted after an order is successfully delivered.";
    } else if (!isWithinWindow) {
      orderIneligibleReason = `The ${returnWindowDays}-day return window from delivery has expired.`;
    } else if (!hasAnyEligibleItem) {
      orderIneligibleReason = "No items in this order are currently eligible for return.";
    }

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      isDelivered,
      deliveredAt,
      returnWindowDays,
      windowExpiresAt,
      isWithinWindow,
      isEligible: isDelivered && isWithinWindow && hasAnyEligibleItem,
      items,
      ineligibleReason: orderIneligibleReason,
    };
  }

  /**
   * Validate that the requested items strictly satisfy return eligibility.
   * Throws ValidationError if any requested item violates bounds.
   */
  async assertCanReturnItems(
    orderId: string,
    requestedItems: CreateReturnItemInput[],
    customerId?: string
  ): Promise<OrderEligibilityResult> {
    if (!requestedItems || requestedItems.length === 0) {
      throw new ValidationError("At least one item must be selected for return.");
    }

    const eligibility = await this.evaluateOrderEligibility(orderId, customerId);

    if (!eligibility.isEligible) {
      throw new ValidationError(
        eligibility.ineligibleReason || "Order is not eligible for return."
      );
    }

    const itemMap = new Map(eligibility.items.map((i) => [i.orderItemId, i]));

    for (const req of requestedItems) {
      const item = itemMap.get(req.orderItemId);
      if (!item) {
        throw new ValidationError(
          `Order item ${req.orderItemId} was not found in original order.`
        );
      }

      if (!item.isEligible) {
        throw new ValidationError(
          `Item "${item.productName}" is not eligible for return: ${item.ineligibleReason}`
        );
      }

      if (req.quantity <= 0) {
        throw new ValidationError(`Quantity for "${item.productName}" must be at least 1.`);
      }

      if (req.quantity > item.remainingReturnableQuantity) {
        throw new ValidationError(
          `Requested return quantity (${req.quantity}) exceeds remaining returnable quantity (${item.remainingReturnableQuantity}) for item "${item.productName}".`
        );
      }
    }

    return eligibility;
  }
}

export const returnEligibilityService = new ReturnEligibilityService();
