/**
 * VÉRONA — Order Domain Repository (Phase 19)
 *
 * Encapsulates all persistence, atomic queries, and audit writes for Orders.
 */

import { ClientSession, FilterQuery } from "mongoose";
import { OrderModel, OrderStatusHistoryModel, PaymentModel } from "@/db/models";
import { IOrder, IOrderStatusHistory, PaginatedResult } from "@/types/database";
import { OrderStatus, PaymentStatus } from "@/constants/status";
import { OrderFilterOptions, PaymentOrderReconciliationMismatch } from "../types/order.types";

export interface CreateOrderRecordData {
  orderNumber: string;
  customerId: string;
  checkoutSessionId?: string;
  email: string;
  phone: string;
  items: IOrder["items"];
  pricing: IOrder["pricing"];
  shippingAddress: IOrder["shippingAddress"];
  billingAddress: IOrder["billingAddress"];
  coupon?: IOrder["coupon"];
  paymentId?: string;
  paymentStatus: PaymentStatus;
  paymentDetails?: IOrder["paymentDetails"];
  status: OrderStatus;
  notes?: string;
}

export class OrderRepository {
  /**
   * Creates a new Order document.
   */
  async createOrder(
    data: CreateOrderRecordData,
    session?: ClientSession
  ): Promise<IOrder> {
    const docs = await OrderModel.create([data], session ? { session } : {});
    const doc = docs[0];
    if (!doc) {
      throw new Error("Failed to persist order document");
    }
    return doc.toObject();
  }

  /**
   * Find order by unique customer-facing orderNumber.
   */
  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return OrderModel.findOne({ orderNumber: orderNumber.toUpperCase() }).lean<IOrder>();
  }

  /**
   * Find order by internal ObjectId.
   */
  async findById(id: string): Promise<IOrder | null> {
    return OrderModel.findById(id).lean<IOrder>();
  }

  /**
   * Find order by verified payment ID (used for idempotency).
   */
  async findByPaymentId(paymentId: string): Promise<IOrder | null> {
    return OrderModel.findOne({ paymentId }).lean<IOrder>();
  }

  /**
   * Find order by checkoutSessionId.
   */
  async findByCheckoutSessionId(checkoutSessionId: string): Promise<IOrder | null> {
    return OrderModel.findOne({ checkoutSessionId }).lean<IOrder>();
  }

  /**
   * Retrieve paginated orders for a customer.
   */
  async findByCustomerId(
    customerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<IOrder>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      OrderModel.find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IOrder[]>(),
      OrderModel.countDocuments({ customerId }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Query orders for admin with filtering, search, and pagination.
   */
  async findOrders(
    filters: OrderFilterOptions = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<IOrder>> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(50, Math.max(1, pagination.limit || 10));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IOrder> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), "i");
      query.$or = [
        { orderNumber: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const [items, total] = await Promise.all([
      OrderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IOrder[]>(),
      OrderModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Update order status with optional cancellation metadata.
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    cancellation?: IOrder["cancellation"],
    session?: ClientSession
  ): Promise<IOrder | null> {
    const update: Record<string, unknown> = { status };
    if (cancellation) {
      update.cancellation = cancellation;
    }

    return OrderModel.findByIdAndUpdate(
      orderId,
      { $set: update },
      { new: true, session }
    ).lean<IOrder>();
  }

  /**
   * Append status history audit record.
   */
  async recordStatusHistory(
    data: {
      orderId: string;
      fromStatus: OrderStatus;
      toStatus: OrderStatus;
      changedBy: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
    session?: ClientSession
  ): Promise<void> {
    await OrderStatusHistoryModel.create(
      [
        {
          orderId: data.orderId,
          fromStatus: data.fromStatus,
          toStatus: data.toStatus,
          changedBy: data.changedBy,
          reason: data.reason,
          metadata: data.metadata || {},
        },
      ],
      session ? { session } : {}
    );
  }

  /**
   * Backward-compatible alias for recordStatusChange
   */
  async recordStatusChange(
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    changedBy: string,
    reason?: string,
    session?: ClientSession
  ): Promise<void> {
    return this.recordStatusHistory(
      { orderId, fromStatus, toStatus, changedBy, reason },
      session
    );
  }

  /**
   * Retrieve full audit history for an order.
   */
  async getStatusHistory(orderId: string): Promise<IOrderStatusHistory[]> {
    return OrderStatusHistoryModel.find({ orderId })
      .sort({ createdAt: 1 })
      .lean<IOrderStatusHistory[]>();
  }

  /**
   * Reconciliation foundation: Identify CAPTURED payments without corresponding Order records.
   */
  async findCapturedPaymentsWithoutOrder(): Promise<PaymentOrderReconciliationMismatch[]> {
    const capturedPayments = await PaymentModel.find({
      status: PaymentStatus.CAPTURED,
    }).lean();

    const paymentIds = capturedPayments.map((p) => p._id.toString());
    const existingOrders = await OrderModel.find({
      paymentId: { $in: paymentIds },
    }).lean<IOrder[]>();

    const orderPaymentIdSet = new Set(
      existingOrders.map((o) => o.paymentId?.toString())
    );

    const mismatches: PaymentOrderReconciliationMismatch[] = [];

    for (const payment of capturedPayments) {
      const pId = payment._id.toString();
      if (!orderPaymentIdSet.has(pId)) {
        mismatches.push({
          type: "CAPTURED_PAYMENT_WITHOUT_ORDER",
          paymentId: pId,
          paymentStatus: payment.status,
          paymentAmountMinor: payment.amount,
          description: `Payment ${pId} is CAPTURED in payment system but no Order document exists.`,
        });
      }
    }

    return mismatches;
  }

  /**
   * Reconciliation foundation: Identify Confirmed Orders with amount mismatches compared to verified payments.
   */
  async findOrdersWithPaymentMismatch(): Promise<PaymentOrderReconciliationMismatch[]> {
    const orders = await OrderModel.find({
      paymentId: { $ne: null },
    }).lean<IOrder[]>();

    const paymentIds = orders
      .map((o) => o.paymentId?.toString())
      .filter((id): id is string => Boolean(id));

    const payments = await PaymentModel.find({
      _id: { $in: paymentIds },
    }).lean();

    const paymentMap = new Map(payments.map((p) => [p._id.toString(), p]));
    const mismatches: PaymentOrderReconciliationMismatch[] = [];

    for (const order of orders) {
      if (!order.paymentId) continue;
      const payment = paymentMap.get(order.paymentId.toString());

      if (!payment) {
        mismatches.push({
          type: "PAYMENT_STATUS_MISMATCH",
          paymentId: order.paymentId.toString(),
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          paymentStatus: PaymentStatus.UNKNOWN,
          orderStatus: order.status,
          paymentAmountMinor: 0,
          orderAmountMinor: order.pricing.total,
          description: `Order ${order.orderNumber} references missing payment ${order.paymentId}.`,
        });
        continue;
      }

      if (payment.amount !== order.pricing.total) {
        mismatches.push({
          type: "PAYMENT_AMOUNT_MISMATCH",
          paymentId: payment._id.toString(),
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          paymentStatus: payment.status,
          orderStatus: order.status,
          paymentAmountMinor: payment.amount,
          orderAmountMinor: order.pricing.total,
          description: `Order ${order.orderNumber} total (${order.pricing.total}) does not match payment amount (${payment.amount}).`,
        });
      }
    }

    return mismatches;
  }
}

export const orderRepository = new OrderRepository();
