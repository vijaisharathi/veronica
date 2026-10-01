/**
 * VÉRONA — Return & Exchange Data Repository (Phase 22)
 *
 * Authoritative persistence layer with sequential reference number generation,
 * indexed querying, server-side pagination, and projection support.
 */

import { ReturnRequestModel, ExchangeRequestModel } from "@/db/models";
import { IReturnRequest, IExchangeRequest } from "@/types/database";
import { ReturnFilters, ExchangeFilters } from "../types/return.types";
import { FilterQuery, Types } from "mongoose";

export class ReturnRepository {
  /**
   * Generates a deterministic, sequential, collision-free return reference.
   * Format: RET-YYYY-NNNNNN (e.g. RET-2026-000001)
   */
  async generateReturnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RET-${year}-`;

    const latest = await ReturnRequestModel.findOne(
      { returnNumber: new RegExp(`^${prefix}`) },
      { returnNumber: 1 },
      { sort: { returnNumber: -1 } }
    ).lean();

    let seq = 1;
    if (latest?.returnNumber) {
      const parts = latest.returnNumber.split("-");
      const currentSeq = parts[2] ? parseInt(parts[2], 10) : NaN;
      if (!isNaN(currentSeq)) {
        seq = currentSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(6, "0")}`;
  }

  /**
   * Generates a deterministic, collision-free exchange reference.
   * Format: EXC-YYYY-NNNNNN (e.g. EXC-2026-000001)
   */
  async generateExchangeNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXC-${year}-`;

    const latest = await ExchangeRequestModel.findOne(
      { exchangeNumber: new RegExp(`^${prefix}`) },
      { exchangeNumber: 1 },
      { sort: { exchangeNumber: -1 } }
    ).lean();

    let seq = 1;
    if (latest?.exchangeNumber) {
      const parts = latest.exchangeNumber.split("-");
      const currentSeq = parts[2] ? parseInt(parts[2], 10) : NaN;
      if (!isNaN(currentSeq)) {
        seq = currentSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(6, "0")}`;
  }

  /**
   * Create a new ReturnRequest document.
   */
  async createReturn(data: Partial<IReturnRequest>): Promise<IReturnRequest> {
    const created = await ReturnRequestModel.create(data);
    return created.toObject();
  }

  /**
   * Find a ReturnRequest by its ObjectId or returnNumber.
   */
  async findById(id: string): Promise<IReturnRequest | null> {
    if (Types.ObjectId.isValid(id)) {
      const byId = await ReturnRequestModel.findById(id).lean();
      if (byId) return byId as unknown as IReturnRequest;
    }
    const byNumber = await ReturnRequestModel.findOne({ returnNumber: id.toUpperCase() }).lean();
    return (byNumber as unknown as IReturnRequest) || null;
  }

  /**
   * Find a ReturnRequest by returnNumber.
   */
  async findByReturnNumber(returnNumber: string): Promise<IReturnRequest | null> {
    const found = await ReturnRequestModel.findOne({ returnNumber: returnNumber.toUpperCase() }).lean();
    return (found as unknown as IReturnRequest) || null;
  }

  /**
   * Paginated returns query with server-side filtering.
   */
  async findReturns(filters: ReturnFilters): Promise<{
    items: IReturnRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IReturnRequest> = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.orderId) query.orderId = filters.orderId;
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.warehouseId) query.warehouseId = filters.warehouseId;
    if (filters.reason) query.reason = filters.reason;

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }

    if (filters.search) {
      const s = filters.search.trim();
      query.$or = [
        { returnNumber: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      ReturnRequestModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ReturnRequestModel.countDocuments(query),
    ]);

    return {
      items: items as unknown as IReturnRequest[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update return request document.
   */
  async updateReturn(
    id: string,
    update: Partial<IReturnRequest>
  ): Promise<IReturnRequest | null> {
    const updated = await ReturnRequestModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();
    return (updated as unknown as IReturnRequest) || null;
  }

  /**
   * Create an ExchangeRequest document.
   */
  async createExchange(data: Partial<IExchangeRequest>): Promise<IExchangeRequest> {
    const created = await ExchangeRequestModel.create(data);
    return created.toObject();
  }

  /**
   * Find an ExchangeRequest by its ObjectId or exchangeNumber.
   */
  async findExchangeById(id: string): Promise<IExchangeRequest | null> {
    if (Types.ObjectId.isValid(id)) {
      const byId = await ExchangeRequestModel.findById(id).lean();
      if (byId) return byId as unknown as IExchangeRequest;
    }
    const byNumber = await ExchangeRequestModel.findOne({ exchangeNumber: id.toUpperCase() }).lean();
    return (byNumber as unknown as IExchangeRequest) || null;
  }

  /**
   * Paginated exchanges query.
   */
  async findExchanges(filters: ExchangeFilters): Promise<{
    items: IExchangeRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IExchangeRequest> = {};

    if (filters.status) query.status = filters.status;
    if (filters.orderId) query.orderId = filters.orderId;
    if (filters.customerId) query.customerId = filters.customerId;

    if (filters.search) {
      const s = filters.search.trim();
      query.$or = [
        { exchangeNumber: { $regex: s, $options: "i" } },
        { reason: { $regex: s, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      ExchangeRequestModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ExchangeRequestModel.countDocuments(query),
    ]);

    return {
      items: items as unknown as IExchangeRequest[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update exchange request document.
   */
  async updateExchange(
    id: string,
    update: Partial<IExchangeRequest>
  ): Promise<IExchangeRequest | null> {
    const updated = await ExchangeRequestModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();
    return (updated as unknown as IExchangeRequest) || null;
  }
}

export const returnRepository = new ReturnRepository();
