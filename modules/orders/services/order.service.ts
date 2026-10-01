/**
 * VÉRONA — Order Domain Service (Phase 19)
 *
 * Server-authoritative business orchestration layer for Orders.
 * Converts verified payments into immutable order snapshots, enforces
 * state machine transitions, guarantees customer IDOR isolation, and
 * maintains full audit history.
 */

import crypto from "node:crypto";
import {
  OrderModel,
  PaymentModel,
  CheckoutSessionModel,
  CartModel,
  CartItemModel,
  CustomerModel,
} from "@/db/models";
import { OrderStatus, PaymentStatus, CheckoutSessionStatus, CartStatus } from "@/constants/status";
import { IOrder, IOrderStatusHistory, PaginatedResult } from "@/types/database";
import { AppError, NotFoundError, AuthorizationError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { OrderRepository, orderRepository } from "../repositories/order.repository";
import {
  assertValidOrderTransition,
  canCustomerCancelOrder,
} from "../state-machine/order-state-machine";
import { generateOrderNumber } from "../utils/order-number";
import {
  CreateOrderInput,
  CancelOrderInput,
  OrderDTO,
  OrderItemDTO,
  OrderPricingDTO,
  OrderAddressDTO,
  OrderTimelineStep,
  OrderFilterOptions,
  PaymentOrderReconciliationMismatch,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderCancelledEvent,
} from "../types/order.types";
import { inventoryService } from "@/modules/inventory/services/inventory.service";

export class OrderService {
  constructor(private readonly repo: OrderRepository = orderRepository) {}

  /**
   * Authoritatively converts a server-verified CAPTURED payment into an immutable Order.
   * Idempotent: repeated calls for the same payment return the existing order.
   */
  async createOrderFromPayment(
    customerId: string,
    input: CreateOrderInput
  ): Promise<OrderDTO> {
    const { paymentId } = input;

    if (!paymentId) {
      throw new ValidationError("Payment ID is required to create an order");
    }

    // 1. Idempotency Check: if order already exists for this payment, return it immediately
    const existingOrder = await this.repo.findByPaymentId(paymentId);
    if (existingOrder) {
      if (existingOrder.customerId.toString() !== customerId) {
        throw new AuthorizationError("Payment does not belong to authenticated customer");
      }
      const history = await this.repo.getStatusHistory(existingOrder._id.toString());
      logger.info("Order creation idempotent hit: returning existing order", {
        context: "OrderService",
        metadata: { paymentId, orderNumber: existingOrder.orderNumber },
      });
      return this.mapOrderToDTO(existingOrder, history);
    }

    // 2. Fetch Payment and verify authoritative state
    const payment = await PaymentModel.findById(paymentId).lean();
    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    // 3. Verify Payment Ownership
    if (payment.customerId.toString() !== customerId) {
      throw new AuthorizationError("Payment does not belong to authenticated customer");
    }

    // 4. Verify Payment Status is CAPTURED
    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new ValidationError(
        `Order cannot be created: payment is in '${payment.status}' state, expected '${PaymentStatus.CAPTURED}'`
      );
    }

    // 5. Load Checkout Session
    const checkout = await CheckoutSessionModel.findById(payment.checkoutSessionId).lean();
    if (!checkout) {
      throw new NotFoundError("Associated checkout session not found");
    }

    if (checkout.customerId.toString() !== customerId) {
      throw new AuthorizationError("Checkout session does not belong to customer");
    }

    if (!checkout.addressSnapshot) {
      throw new ValidationError("Checkout session lacks delivery address snapshot");
    }

    // 6. Verify Payment Amount matches Authoritative Checkout Pricing
    const expectedAmountMinor = checkout.pricingSnapshot.amountDueBeforePaymentMinor;
    if (payment.amount !== expectedAmountMinor) {
      logger.error("Payment amount mismatch detected during order formulation", {
        context: "OrderService",
        metadata: {
          paymentId,
          paymentAmount: payment.amount,
          checkoutAmount: expectedAmountMinor,
          customerId,
        },
      });
      throw new AppError(
        `Payment amount (${payment.amount}) does not match authoritative checkout pricing (${expectedAmountMinor}).`,
        "PAYMENT_AMOUNT_MISMATCH",
        400
      );
    }

    // 7. Load Customer Profile
    const customer = await CustomerModel.findById(customerId).lean();
    if (!customer) {
      throw new NotFoundError("Customer account record not found");
    }

    // 8. Load Cart & Cart Items
    const cart = await CartModel.findById(checkout.cartId).lean();
    if (!cart) {
      throw new NotFoundError("Customer shopping cart not found");
    }

    const cartItems = await CartItemModel.find({ cartId: checkout.cartId }).lean();
    if (!cartItems || cartItems.length === 0) {
      throw new ValidationError("Cannot create order from empty shopping bag");
    }

    // 9. Formulate Immutable Order Item Snapshots
    const itemsSnapshot: IOrder["items"] = cartItems.map((item) => {
      const unitPrice = item.unitPriceSnapshot;
      const quantity = item.quantity;
      const lineSubtotal = unitPrice * quantity;
      const discount = 0;
      const tax = 0;
      const finalPrice = lineSubtotal - discount;

      return {
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        sku: item.variantSnapshot.sku,
        productName: item.productNameSnapshot,
        brandName: "VÉRONA Atelier",
        size: item.variantSnapshot.size,
        color: item.variantSnapshot.color,
        image: item.imageSnapshot,
        quantity,
        unitPrice,
        discount,
        tax,
        finalPrice,
      };
    });

    // 10. Formulate Immutable Pricing Snapshot
    const pricingSnapshot: IOrder["pricing"] = {
      subtotal: checkout.pricingSnapshot.subtotalMinor,
      discount: checkout.pricingSnapshot.promotionDiscountMinor,
      couponDiscount: checkout.pricingSnapshot.couponDiscountMinor || 0,
      totalDiscount: checkout.pricingSnapshot.totalDiscountMinor,
      shipping: 0,
      tax: 0,
      total: expectedAmountMinor,
      currency: checkout.pricingSnapshot.currency || "INR",
    };

    // 11. Formulate Immutable Address Snapshot
    const addressSnapshot: IOrder["shippingAddress"] = {
      fullName: checkout.addressSnapshot.fullName,
      phone: checkout.addressSnapshot.phone,
      addressLine1: checkout.addressSnapshot.addressLine1,
      addressLine2: checkout.addressSnapshot.addressLine2,
      landmark: checkout.addressSnapshot.landmark,
      city: checkout.addressSnapshot.city,
      state: checkout.addressSnapshot.state,
      country: checkout.addressSnapshot.country || "India",
      pincode: checkout.addressSnapshot.postalCode,
    };

    // 12. Formulate Immutable Coupon Snapshot (if applied)
    const couponSnapshot = checkout.appliedCouponCode
      ? {
          code: checkout.appliedCouponCode,
          discountMinor: checkout.pricingSnapshot.couponDiscountMinor || 0,
        }
      : undefined;

    // 13. Formulate Safe Payment Details Snapshot
    const paymentDetailsSnapshot = {
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      currency: payment.currency,
      paidAmountMinor: payment.amount,
    };

    // 14. Generate Unique Order Number
    let orderNumber = generateOrderNumber();
    let collision = await this.repo.findByOrderNumber(orderNumber);
    let attempts = 0;
    while (collision && attempts < 5) {
      orderNumber = generateOrderNumber();
      collision = await this.repo.findByOrderNumber(orderNumber);
      attempts++;
    }

    // 15. Persist Order Record
    const order = await this.repo.createOrder({
      orderNumber,
      customerId,
      checkoutSessionId: checkout._id.toString(),
      email: customer.email,
      phone: customer.phone || addressSnapshot.phone,
      items: itemsSnapshot,
      pricing: pricingSnapshot,
      shippingAddress: addressSnapshot,
      billingAddress: addressSnapshot,
      coupon: couponSnapshot,
      paymentId: payment._id.toString(),
      paymentStatus: payment.status,
      paymentDetails: paymentDetailsSnapshot,
      status: OrderStatus.CONFIRMED,
      notes: "Standard couture fulfillment",
    });

    const orderId = order._id.toString();

    // 16. Record Initial Status History Audit
    await this.repo.recordStatusHistory({
      orderId,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.CONFIRMED,
      changedBy: "SYSTEM",
      reason: "Order created and confirmed from verified payment capture.",
      metadata: {
        paymentId: payment._id.toString(),
        providerOrderId: payment.providerOrderId,
        providerPaymentId: payment.providerPaymentId,
      },
    });

    // 17. Concurrency / State Updates: Link Order to Payment, Complete Checkout, and Convert Cart
    await Promise.all([
      PaymentModel.findByIdAndUpdate(paymentId, {
        $set: { orderId },
      }),
      CheckoutSessionModel.findByIdAndUpdate(checkout._id, {
        $set: { status: CheckoutSessionStatus.COMPLETED },
      }),
      CartModel.findByIdAndUpdate(cart._id, {
        $set: { status: CartStatus.CONVERTED },
      }),
    ]);

    // 18. Consume Stock / Reservations (Phase 20 Inventory Integration)
    try {
      await inventoryService.consumeOrderStock(order);
    } catch (invErr) {
      logger.error("Error consuming stock during order creation", {
        context: "OrderService",
        metadata: { orderId, error: String(invErr) },
      });
    }

    // 18. Emit Domain Event
    const event: OrderCreatedEvent = {
      eventId: crypto.randomUUID(),
      type: "order.created",
      orderId,
      orderNumber: order.orderNumber,
      customerId,
      paymentId,
      totalAmountMinor: order.pricing.total,
      currency: order.pricing.currency,
      createdAt: new Date().toISOString(),
    };

    logger.info("Order successfully created and confirmed", {
      context: "OrderService",
      metadata: { orderId, orderNumber: order.orderNumber, customerId, paymentId },
    });

    const history = await this.repo.getStatusHistory(orderId);
    return this.mapOrderToDTO(order, history);
  }

  /**
   * Retrieves an order by orderNumber with strict customer ownership (Anti-IDOR).
   */
  async getOrderByNumber(customerId: string, orderNumber: string): Promise<OrderDTO> {
    const order = await this.repo.findByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.customerId.toString() !== customerId) {
      // Anti-IDOR: Generic 404 to avoid leaking existence of another customer's order
      throw new NotFoundError("Order not found");
    }

    const history = await this.repo.getStatusHistory(order._id.toString());
    return this.mapOrderToDTO(order, history);
  }

  /**
   * Retrieves paginated orders for a customer.
   */
  async getCustomerOrders(
    customerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<OrderDTO>> {
    const paginated = await this.repo.findByCustomerId(customerId, options);
    const items = paginated.items.map((order) => this.mapOrderToDTO(order, []));

    return {
      items,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
      hasMore: paginated.hasMore,
    };
  }

  /**
   * Customer-initiated cancellation foundation.
   * Allowed only while in CONFIRMED status.
   */
  async cancelOrder(
    customerId: string,
    orderNumber: string,
    input: CancelOrderInput
  ): Promise<OrderDTO> {
    const order = await this.repo.findByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.customerId.toString() !== customerId) {
      throw new NotFoundError("Order not found");
    }

    if (!canCustomerCancelOrder(order)) {
      throw new AppError(
        `Order ${order.orderNumber} cannot be cancelled because it is in '${order.status}' status. Only CONFIRMED orders are cancellable.`,
        "ORDER_NOT_CANCELLABLE",
        400
      );
    }

    assertValidOrderTransition(order.status, OrderStatus.CANCELLED);

    const cancelledAt = new Date();
    const updatedOrder = await this.repo.updateOrderStatus(
      order._id.toString(),
      OrderStatus.CANCELLED,
      {
        reason: input.reason,
        cancelledAt,
        cancelledBy: customerId,
        notes: input.notes,
      }
    );

    await this.repo.recordStatusHistory({
      orderId: order._id.toString(),
      fromStatus: order.status,
      toStatus: OrderStatus.CANCELLED,
      changedBy: customerId,
      reason: input.reason,
      metadata: { notes: input.notes, actorType: "CUSTOMER" },
    });

    const event: OrderCancelledEvent = {
      eventId: crypto.randomUUID(),
      type: "order.cancelled",
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId,
      reason: input.reason,
      cancelledBy: customerId,
      timestamp: cancelledAt.toISOString(),
    };

    logger.info("Order cancelled by customer", {
      context: "OrderService",
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber, reason: input.reason },
    });

    // Restore stock to inventory (Phase 20)
    try {
      await inventoryService.restoreOrderStock(order, input.reason, customerId);
    } catch (invErr) {
      logger.error("Error restoring stock on order cancellation", {
        context: "OrderService",
        metadata: { orderId: order._id.toString(), error: String(invErr) },
      });
    }

    const history = await this.repo.getStatusHistory(order._id.toString());
    return this.mapOrderToDTO(updatedOrder!, history);
  }

  /**
   * Admin: List orders with search, status filtering, and pagination.
   */
  async getAdminOrders(
    filters: OrderFilterOptions = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<OrderDTO>> {
    const paginated = await this.repo.findOrders(filters, pagination);
    const items = paginated.items.map((order) => this.mapOrderToDTO(order, []));

    return {
      items,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
      hasMore: paginated.hasMore,
    };
  }

  /**
   * Admin: Retrieve complete order details including audit trail.
   */
  async getAdminOrderById(orderId: string): Promise<OrderDTO> {
    const order = await this.repo.findById(orderId);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const history = await this.repo.getStatusHistory(order._id.toString());
    return this.mapOrderToDTO(order, history);
  }

  /**
   * Admin: Transition order status with centralized state machine validation.
   */
  async updateOrderStatusAsAdmin(
    orderId: string,
    staffIdentifier: string,
    newStatus: OrderStatus,
    reason?: string
  ): Promise<OrderDTO> {
    const order = await this.repo.findById(orderId);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    assertValidOrderTransition(order.status, newStatus);

    const updatedOrder = await this.repo.updateOrderStatus(orderId, newStatus);

    await this.repo.recordStatusHistory({
      orderId,
      fromStatus: order.status,
      toStatus: newStatus,
      changedBy: staffIdentifier,
      reason: reason || `Status updated to ${newStatus} by staff ${staffIdentifier}`,
      metadata: { actorType: "STAFF" },
    });

    const event: OrderStatusChangedEvent = {
      eventId: crypto.randomUUID(),
      type: "order.status.changed",
      orderId,
      orderNumber: order.orderNumber,
      fromStatus: order.status,
      toStatus: newStatus,
      changedBy: staffIdentifier,
      reason,
      timestamp: new Date().toISOString(),
    };

    logger.info("Order status transitioned by admin", {
      context: "OrderService",
      metadata: { orderId, orderNumber: order.orderNumber, from: order.status, to: newStatus, staff: staffIdentifier },
    });

    if (newStatus === OrderStatus.CANCELLED) {
      try {
        await inventoryService.restoreOrderStock(order, reason || "Admin cancellation", staffIdentifier);
      } catch (invErr) {
        logger.error("Error restoring stock on admin order cancellation", {
          context: "OrderService",
          metadata: { orderId, error: String(invErr) },
        });
      }
    }

    const history = await this.repo.getStatusHistory(orderId);
    return this.mapOrderToDTO(updatedOrder!, history);
  }

  /**
   * Reconciliation foundation: Run scan for payment/order discrepancies.
   */
  async runReconciliationScan(): Promise<PaymentOrderReconciliationMismatch[]> {
    const [missingOrders, amountMismatches] = await Promise.all([
      this.repo.findCapturedPaymentsWithoutOrder(),
      this.repo.findOrdersWithPaymentMismatch(),
    ]);

    return [...missingOrders, ...amountMismatches];
  }

  /**
   * Transforms raw MongoDB Order document and history into a safe OrderDTO.
   */
  private mapOrderToDTO(order: IOrder, history: IOrderStatusHistory[] = []): OrderDTO {
    const items: OrderItemDTO[] = (order.items || []).map((item) => ({
      id: (item as unknown as { _id?: unknown })._id
        ? String((item as unknown as { _id: unknown })._id)
        : undefined,
      productId: item.productId.toString(),
      variantId: item.variantId.toString(),
      sku: item.sku,
      productName: item.productName,
      brandName: item.brandName,
      size: item.size,
      color: item.color,
      image: item.image,
      quantity: item.quantity,
      unitPriceMinor: item.unitPrice,
      discountMinor: item.discount,
      taxMinor: item.tax,
      finalPriceMinor: item.finalPrice,
    }));

    const pricing: OrderPricingDTO = {
      subtotalMinor: order.pricing.subtotal,
      discountMinor: order.pricing.discount,
      couponDiscountMinor: order.pricing.couponDiscount || 0,
      totalDiscountMinor: order.pricing.totalDiscount || order.pricing.discount,
      shippingMinor: order.pricing.shipping,
      taxMinor: order.pricing.tax,
      totalMinor: order.pricing.total,
      currency: order.pricing.currency,
    };

    const shippingAddress: OrderAddressDTO = {
      fullName: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      addressLine1: order.shippingAddress.addressLine1,
      addressLine2: order.shippingAddress.addressLine2,
      landmark: order.shippingAddress.landmark,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      country: order.shippingAddress.country,
      pincode: order.shippingAddress.pincode,
    };

    const billingAddress: OrderAddressDTO = order.billingAddress
      ? {
          fullName: order.billingAddress.fullName,
          phone: order.billingAddress.phone,
          addressLine1: order.billingAddress.addressLine1,
          addressLine2: order.billingAddress.addressLine2,
          landmark: order.billingAddress.landmark,
          city: order.billingAddress.city,
          state: order.billingAddress.state,
          country: order.billingAddress.country,
          pincode: order.billingAddress.pincode,
        }
      : shippingAddress;

    const timeline = this.buildTimeline(order.status, history);

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      checkoutSessionId: order.checkoutSessionId ? order.checkoutSessionId.toString() : undefined,
      email: order.email,
      phone: order.phone,
      items,
      pricing,
      shippingAddress,
      billingAddress,
      coupon: order.coupon
        ? {
            code: order.coupon.code,
            discountMinor: order.coupon.discountMinor,
            couponId: order.coupon.couponId?.toString(),
          }
        : undefined,
      paymentSummary: {
        paymentId: order.paymentId?.toString(),
        provider: order.paymentDetails?.provider || "razorpay",
        providerOrderId: order.paymentDetails?.providerOrderId,
        providerPaymentId: order.paymentDetails?.providerPaymentId,
        paymentStatus: order.paymentStatus,
        paidAmountMinor: order.paymentDetails?.paidAmountMinor || order.pricing.total,
        currency: order.paymentDetails?.currency || order.pricing.currency,
      },
      status: order.status,
      cancellation: order.cancellation
        ? {
            reason: order.cancellation.reason,
            cancelledAt: order.cancellation.cancelledAt?.toISOString?.() || new Date(order.cancellation.cancelledAt).toISOString(),
            cancelledBy: order.cancellation.cancelledBy,
            notes: order.cancellation.notes,
          }
        : undefined,
      timeline,
      canCancel: canCustomerCancelOrder(order),
      notes: order.notes,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString(),
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : new Date(order.updatedAt).toISOString(),
    };
  }

  /**
   * Constructs the linear timeline steps for customer visibility.
   */
  private buildTimeline(
    currentStatus: OrderStatus,
    history: IOrderStatusHistory[] = []
  ): OrderTimelineStep[] {
    const historyMap = new Map<OrderStatus, string>();
    for (const h of history) {
      if (h.createdAt) {
        const iso = h.createdAt instanceof Date ? h.createdAt.toISOString() : new Date(h.createdAt).toISOString();
        historyMap.set(h.toStatus, iso);
      }
    }

    if (currentStatus === OrderStatus.CANCELLED) {
      return [
        {
          status: OrderStatus.CONFIRMED,
          label: "Order Confirmed",
          description: "Payment verified and order confirmed.",
          completed: true,
          current: false,
          timestamp: historyMap.get(OrderStatus.CONFIRMED),
        },
        {
          status: OrderStatus.CANCELLED,
          label: "Order Cancelled",
          description: "Order has been cancelled.",
          completed: true,
          current: true,
          timestamp: historyMap.get(OrderStatus.CANCELLED),
        },
      ];
    }

    const standardSteps: Array<{
      status: OrderStatus;
      label: string;
      description: string;
    }> = [
      {
        status: OrderStatus.CONFIRMED,
        label: "Order Confirmed",
        description: "Payment verified and couture order logged.",
      },
      {
        status: OrderStatus.PROCESSING,
        label: "Processing",
        description: "Garments selected and tailored for fulfillment.",
      },
      {
        status: OrderStatus.PACKED,
        label: "Packed",
        description: "Packaged in signature atelier presentation.",
      },
      {
        status: OrderStatus.SHIPPED,
        label: "Dispatched",
        description: "Handed over to priority delivery courier.",
      },
      {
        status: OrderStatus.OUT_FOR_DELIVERY,
        label: "Out for Delivery",
        description: "Courier out for final destination drop-off.",
      },
      {
        status: OrderStatus.DELIVERED,
        label: "Delivered",
        description: "Garments safely received.",
      },
    ];

    const statusHierarchy: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.PENDING_PAYMENT]: 0,
      [OrderStatus.PAYMENT_FAILED]: 0,
      [OrderStatus.CONFIRMED]: 1,
      [OrderStatus.PROCESSING]: 2,
      [OrderStatus.PACKED]: 3,
      [OrderStatus.SHIPPED]: 4,
      [OrderStatus.OUT_FOR_DELIVERY]: 5,
      [OrderStatus.DELIVERED]: 6,
      [OrderStatus.CANCELLED]: -1,
      [OrderStatus.RETURN_REQUESTED]: 7,
      [OrderStatus.RETURN_APPROVED]: 8,
      [OrderStatus.RETURN_REJECTED]: 8,
      [OrderStatus.RETURN_PICKED_UP]: 9,
      [OrderStatus.RETURNED]: 10,
      [OrderStatus.REFUND_INITIATED]: 11,
      [OrderStatus.REFUNDED]: 12,
      [OrderStatus.EXCHANGE_REQUESTED]: 7,
      [OrderStatus.EXCHANGED]: 8,
    };

    const currentLevel = statusHierarchy[currentStatus] || 0;

    return standardSteps.map((step) => {
      const stepLevel = statusHierarchy[step.status];
      const completed = stepLevel <= currentLevel;
      const current = step.status === currentStatus;

      return {
        status: step.status,
        label: step.label,
        description: step.description,
        completed,
        current,
        timestamp: historyMap.get(step.status),
      };
    });
  }
}

export const orderService = new OrderService();
