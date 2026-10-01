/**
 * VÉRONA — Refund Domain Repository
 *
 * Encapsulates all data access and persistence for refunds, attempts,
 * reconciliation tracking, and customer/admin queries.
 */

import { FilterQuery } from "mongoose";
import { RefundModel } from "@/db/models";
import { RefundStatus } from "@/constants/status";
import { IRefund, IRefundAttempt, IRefundReconciliationState } from "@/types/database";
import { AdminRefundQueryFilters } from "../types/refund.types";

export class RefundRepository {
  /**
   * Generates a unique, customer-safe sequential refund reference.
   * Format: REF-YYYY-NNNNNN (e.g. REF-2026-000001)
   */
  async generateRefundNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REF-${year}-`;

    const latest = await RefundModel.findOne({
      refundNumber: new RegExp(`^${prefix}`),
    })
      .sort({ refundNumber: -1 })
      .select({ refundNumber: 1 })
      .lean();

    let nextSequence = 1;
    if (latest && latest.refundNumber) {
      const parts = latest.refundNumber.split("-");
      if (parts.length === 3) {
        const parsed = parseInt(parts[2] || "0", 10);
        if (!isNaN(parsed)) {
          nextSequence = parsed + 1;
        }
      }
    }

    const padded = String(nextSequence).padStart(6, "0");
    return `${prefix}${padded}`;
  }

  /**
   * Persists a new refund record.
   */
  async createRefund(data: Partial<IRefund>): Promise<IRefund> {
    const created = await RefundModel.create(data);
    return created.toObject() as IRefund;
  }

  /**
   * Finds a refund by its internal MongoDB ID.
   */
  async findById(id: string): Promise<IRefund | null> {
    return (await RefundModel.findById(id).lean()) as IRefund | null;
  }

  /**
   * Finds a refund by its customer-facing unique refund number.
   */
  async findByRefundNumber(refundNumber: string): Promise<IRefund | null> {
    return (await RefundModel.findOne({
      refundNumber: refundNumber.toUpperCase().trim(),
    }).lean()) as IRefund | null;
  }

  /**
   * Finds all refunds associated with an order.
   */
  async findByOrderId(orderId: string): Promise<IRefund[]> {
    return (await RefundModel.find({ orderId })
      .sort({ createdAt: -1 })
      .lean()) as IRefund[];
  }

  /**
   * Finds all refunds for an authenticated customer with pagination.
   */
  async findByCustomerId(
    customerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ refunds: IRefund[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      RefundModel.find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RefundModel.countDocuments({ customerId }),
    ]);

    return { refunds: refunds as IRefund[], total };
  }

  /**
   * Finds a refund generated for a specific return request.
   */
  async findByReturnRequestId(returnRequestId: string): Promise<IRefund | null> {
    return (await RefundModel.findOne({ returnRequestId }).lean()) as IRefund | null;
  }

  /**
   * Finds a refund by external provider refund ID.
   */
  async findByProviderRefundId(providerRefundId: string): Promise<IRefund | null> {
    return (await RefundModel.findOne({ providerRefundId }).lean()) as IRefund | null;
  }

  /**
   * Finds a refund by source type and source ID for idempotency checks.
   */
  async findBySource(sourceType: string, sourceId: string): Promise<IRefund | null> {
    return (await RefundModel.findOne({ sourceType, sourceId }).lean()) as IRefund | null;
  }

  /**
   * Retrieves all non-failed (active, processing, or completed) refunds for a payment.
   * Used to calculate cumulative committed amounts.
   */
  async getCommittedRefundsForPayment(paymentId: string): Promise<IRefund[]> {
    return (await RefundModel.find({
      paymentId,
      status: { $ne: RefundStatus.FAILED },
    }).lean()) as IRefund[];
  }

  /**
   * Atomically updates a refund's status conditional on current status.
   */
  async updateStatus(
    id: string,
    fromStatus: RefundStatus,
    toStatus: RefundStatus,
    updates: Partial<IRefund> = {}
  ): Promise<IRefund | null> {
    const updated = await RefundModel.findOneAndUpdate(
      { _id: id, status: fromStatus },
      {
        $set: {
          status: toStatus,
          ...updates,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    return updated as IRefund | null;
  }

  /**
   * Updates a refund by ID unconditionally.
   */
  async updateById(id: string, updates: Partial<IRefund>): Promise<IRefund | null> {
    const updated = await RefundModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean();
    return updated as IRefund | null;
  }

  /**
   * Appends an attempt record to the refund.
   */
  async addAttempt(id: string, attempt: IRefundAttempt): Promise<IRefund | null> {
    const updated = await RefundModel.findByIdAndUpdate(
      id,
      {
        $push: { attempts: attempt },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    ).lean();

    return updated as IRefund | null;
  }

  /**
   * Updates reconciliation state metadata.
   */
  async updateReconciliation(
    id: string,
    reconciliationState: IRefundReconciliationState
  ): Promise<IRefund | null> {
    const updated = await RefundModel.findByIdAndUpdate(
      id,
      {
        $set: {
          reconciliationState,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    return updated as IRefund | null;
  }

  /**
   * Lists refunds for admin dashboard with rich server-side filtering, sorting, and pagination.
   */
  async listAdminRefunds(
    filters: AdminRefundQueryFilters
  ): Promise<{ refunds: IRefund[]; total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IRefund> = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.sourceType) query.sourceType = filters.sourceType;
    if (filters.orderNumber) query.orderNumber = new RegExp(filters.orderNumber.trim(), "i");
    if (filters.refundNumber) query.refundNumber = new RegExp(filters.refundNumber.trim(), "i");
    if (filters.providerRefundId) query.providerRefundId = filters.providerRefundId.trim();
    if (filters.customerId) query.customerId = filters.customerId;

    if (filters.search) {
      const term = filters.search.trim();
      query.$or = [
        { refundNumber: new RegExp(term, "i") },
        { orderNumber: new RegExp(term, "i") },
        { providerRefundId: new RegExp(term, "i") },
        { reason: new RegExp(term, "i") },
      ];
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const sortField = filters.sortBy || "createdAt";
    const sortDirection = filters.sortOrder === "asc" ? 1 : -1;

    const [refunds, total] = await Promise.all([
      RefundModel.find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      RefundModel.countDocuments(query),
    ]);

    return { refunds: refunds as IRefund[], total };
  }

  /**
   * Returns count of refunds grouped by status.
   */
  async countRefundsByStatus(): Promise<Record<string, number>> {
    const counts = await RefundModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {
      [RefundStatus.REQUESTED]: 0,
      [RefundStatus.ELIGIBLE]: 0,
      [RefundStatus.INITIATED]: 0,
      [RefundStatus.PROCESSING]: 0,
      [RefundStatus.COMPLETED]: 0,
      [RefundStatus.FAILED]: 0,
      [RefundStatus.RETRY_PENDING]: 0,
      [RefundStatus.RECONCILIATION_REQUIRED]: 0,
    };

    for (const item of counts) {
      if (item._id) result[item._id] = item.count;
    }

    return result;
  }
}

export const refundRepository = new RefundRepository();
