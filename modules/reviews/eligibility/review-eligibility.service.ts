/**
 * VÉRONA — Review Eligibility & Verified Purchase Verification Service (Phase 24)
 *
 * Implements authoritative server-side validation:
 * Customer -> Delivered Order -> Order Item -> Product -> Delivered
 *
 * Guarantees zero client spoofing of verified purchase status.
 * Enforces one active review per customer per product policy.
 */

import { OrderModel, ReviewModel } from "@/db/models";
import { OrderStatus, ReviewStatus } from "@/constants/status";
import { ReviewEligibilityResult } from "../types/review.types";
import { IOrder, IOrderItemSnapshot, IReviewVariantSnapshot } from "@/types/database";

export class ReviewEligibilityService {
  /**
   * Evaluates whether an authenticated customer is eligible to submit a review for a product.
   *
   * @param customerId Authenticated customer's ObjectId string
   * @param productId Target product's ObjectId string
   * @param specificOrderId Optional specific order to link (if initiated from order details)
   * @param specificOrderItemId Optional specific order item
   */
  async evaluateEligibility(
    customerId: string,
    productId: string,
    specificOrderId?: string,
    specificOrderItemId?: string
  ): Promise<ReviewEligibilityResult> {
    // 1. Check if an active review already exists for this customer and product
    const existingReview = await ReviewModel.findOne({
      customerId,
      productId,
      status: { $ne: ReviewStatus.DELETED },
    }).lean();

    if (existingReview) {
      return {
        isEligible: false,
        alreadyReviewed: true,
        existingReviewId: existingReview._id.toString(),
        ineligibleReason: "You have already reviewed this product. You may edit your existing review.",
      };
    }

    // 2. Query delivered orders for this customer containing the product
    const query: Record<string, unknown> = {
      customerId,
      status: OrderStatus.DELIVERED,
      "items.productId": productId,
    };

    if (specificOrderId) {
      query._id = specificOrderId;
    }

    const deliveredOrders = (await OrderModel.find(query)
      .sort({ createdAt: -1 })
      .lean()) as unknown as IOrder[];

    if (!deliveredOrders || deliveredOrders.length === 0) {
      return {
        isEligible: false,
        alreadyReviewed: false,
        ineligibleReason: "Verified reviews require a delivered order containing this garment.",
      };
    }

    // 3. Locate the matching delivered order item
    let matchingOrder: IOrder | undefined;
    let matchingItem: IOrderItemSnapshot | undefined;

    for (const order of deliveredOrders) {
      const item = order.items.find((oi) => {
        const matchesProduct = oi.productId.toString() === productId.toString();
        if (!matchesProduct) return false;
        if (specificOrderItemId) {
          const itemKey = oi.orderItemId || (oi as unknown as { _id?: { toString(): string } })._id?.toString();
          return itemKey === specificOrderItemId;
        }
        return true;
      });

      if (item) {
        matchingOrder = order;
        matchingItem = item;
        break;
      }
    }

    if (!matchingOrder || !matchingItem) {
      return {
        isEligible: false,
        alreadyReviewed: false,
        ineligibleReason: "No delivered purchase found for this garment silhouette.",
      };
    }

    const orderItemId =
      matchingItem.orderItemId ||
      (matchingItem as unknown as { _id?: { toString(): string } })._id?.toString() ||
      matchingItem.variantId;

    const variantSnapshot: IReviewVariantSnapshot = {
      color: matchingItem.color,
      size: matchingItem.size,
      sku: matchingItem.sku,
    };

    return {
      isEligible: true,
      alreadyReviewed: false,
      orderId: matchingOrder._id.toString(),
      orderNumber: matchingOrder.orderNumber,
      orderItemId,
      variantId: matchingItem.variantId,
      variantSnapshot,
      deliveredAt: (matchingOrder as unknown as { updatedAt?: Date }).updatedAt?.toISOString(),
    };
  }

  /**
   * Asserts review eligibility, throwing an error if the customer is not verified to review.
   */
  async assertCanReview(
    customerId: string,
    productId: string,
    orderId?: string,
    orderItemId?: string
  ): Promise<ReviewEligibilityResult> {
    const result = await this.evaluateEligibility(customerId, productId, orderId, orderItemId);

    if (!result.isEligible) {
      throw new Error(result.ineligibleReason || "Customer is ineligible to review this product");
    }

    return result;
  }
}

export const reviewEligibilityService = new ReviewEligibilityService();
