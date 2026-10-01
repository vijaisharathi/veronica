/**
 * VÉRONA — Fulfillment & Shipping Repository (Phase 21)
 *
 * Authoritative data access layer for Fulfillment, Package, Shipment,
 * ShipmentEvent, and ShippingWebhookEvent collections.
 */

import { Types } from "mongoose";
import {
  FulfillmentModel,
  PackageModel,
  ShipmentModel,
  ShipmentEventModel,
  ShippingWebhookEventModel,
} from "@/db/models";
import {
  IFulfillment,
  IPackage,
  IShipment,
  IShipmentEvent,
  IShippingWebhookEvent,
} from "@/types/database";
import { FulfillmentStatus, ShipmentStatus } from "@/constants/status";
import { FulfillmentFilterOptions, ShipmentFilterOptions } from "../types/fulfillment.types";

export class FulfillmentRepository {
  // ── Unique Identifier Generators ──────────────────────────────────────────

  generateFulfillmentNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FUL-${timestamp}-${random}`;
  }

  generatePackageNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PKG-${timestamp}-${random}`;
  }

  generateShipmentNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SHP-${timestamp}-${random}`;
  }

  // ── Fulfillment Operations ────────────────────────────────────────────────

  async createFulfillment(data: Partial<IFulfillment>): Promise<IFulfillment> {
    const fulfillmentNumber = data.fulfillmentNumber || this.generateFulfillmentNumber();
    const doc = await FulfillmentModel.create({
      ...data,
      fulfillmentNumber,
    });
    return doc.toObject<IFulfillment>();
  }

  async findFulfillmentById(id: string): Promise<IFulfillment | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return FulfillmentModel.findById(id).lean<IFulfillment>();
  }

  async findFulfillmentByNumber(fulfillmentNumber: string): Promise<IFulfillment | null> {
    return FulfillmentModel.findOne({ fulfillmentNumber }).lean<IFulfillment>();
  }

  async findFulfillmentsByOrderId(orderId: string): Promise<IFulfillment[]> {
    return FulfillmentModel.find({ orderId }).sort({ createdAt: -1 }).lean<IFulfillment[]>();
  }

  async updateFulfillment(
    id: string,
    update: Record<string, unknown>
  ): Promise<IFulfillment | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return FulfillmentModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean<IFulfillment>();
  }

  async findFulfillments(
    filters: FulfillmentFilterOptions,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{
    items: IFulfillment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.warehouseId) {
      query.warehouseId = filters.warehouseId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.orderId) {
      query.orderId = filters.orderId;
    }
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [
        { fulfillmentNumber: searchRegex },
        { orderId: searchRegex },
        { "items.sku": searchRegex },
        { "items.productName": searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      FulfillmentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IFulfillment[]>(),
      FulfillmentModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async countFulfillmentsByStatus(warehouseId?: string): Promise<Record<string, number>> {
    const match: Record<string, unknown> = {};
    if (warehouseId) {
      match.warehouseId = warehouseId;
    }

    const result = await FulfillmentModel.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const item of result) {
      counts[item._id] = item.count;
    }
    return counts;
  }

  // ── Package Operations ────────────────────────────────────────────────────

  async createPackage(data: Partial<IPackage>): Promise<IPackage> {
    const packageNumber = data.packageNumber || this.generatePackageNumber();
    const doc = await PackageModel.create({
      ...data,
      packageNumber,
    });
    return doc.toObject<IPackage>();
  }

  async findPackageById(id: string): Promise<IPackage | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return PackageModel.findById(id).lean<IPackage>();
  }

  async findPackagesByFulfillmentId(fulfillmentId: string): Promise<IPackage[]> {
    return PackageModel.find({ fulfillmentId }).sort({ createdAt: 1 }).lean<IPackage[]>();
  }

  async findPackagesByOrderId(orderId: string): Promise<IPackage[]> {
    return PackageModel.find({ orderId }).sort({ createdAt: 1 }).lean<IPackage[]>();
  }

  async updatePackage(id: string, update: Partial<IPackage>): Promise<IPackage | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return PackageModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean<IPackage>();
  }

  // ── Shipment Operations ───────────────────────────────────────────────────

  async createShipment(data: Partial<IShipment>): Promise<IShipment> {
    const shipmentNumber = data.shipmentNumber || this.generateShipmentNumber();
    const doc = await ShipmentModel.create({
      ...data,
      shipmentNumber,
    });
    return doc.toObject<IShipment>();
  }

  async findShipmentById(id: string): Promise<IShipment | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ShipmentModel.findById(id).lean<IShipment>();
  }

  async findShipmentByNumber(shipmentNumber: string): Promise<IShipment | null> {
    return ShipmentModel.findOne({ shipmentNumber }).lean<IShipment>();
  }

  async findShipmentByAwb(awbNumber: string): Promise<IShipment | null> {
    return ShipmentModel.findOne({ awbNumber }).lean<IShipment>();
  }

  async findShipmentByProviderShipmentId(
    provider: string,
    providerShipmentId: string
  ): Promise<IShipment | null> {
    return ShipmentModel.findOne({ provider, providerShipmentId }).lean<IShipment>();
  }

  async findShipmentByIdempotencyKey(key: string): Promise<IShipment | null> {
    return ShipmentModel.findOne({ idempotencyKey: key }).lean<IShipment>();
  }

  async findShipmentsByOrderId(orderId: string): Promise<IShipment[]> {
    return ShipmentModel.find({ orderId }).sort({ createdAt: -1 }).lean<IShipment[]>();
  }

  async findShipmentsByFulfillmentId(fulfillmentId: string): Promise<IShipment[]> {
    return ShipmentModel.find({ fulfillmentId }).sort({ createdAt: -1 }).lean<IShipment[]>();
  }

  async updateShipment(
    id: string,
    update: Record<string, unknown>
  ): Promise<IShipment | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ShipmentModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean<IShipment>();
  }

  async findShipments(
    filters: ShipmentFilterOptions,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{
    items: IShipment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.warehouseId) {
      query.warehouseId = filters.warehouseId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.orderId) {
      query.orderId = filters.orderId;
    }
    if (filters.awbNumber) {
      query.awbNumber = filters.awbNumber;
    }
    if (filters.provider) {
      query.provider = filters.provider;
    }

    const [items, total] = await Promise.all([
      ShipmentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IShipment[]>(),
      ShipmentModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ── Shipment Event Operations ─────────────────────────────────────────────

  async recordShipmentEvent(data: Partial<IShipmentEvent>): Promise<IShipmentEvent> {
    const doc = await ShipmentEventModel.create({
      ...data,
      eventTime: data.eventTime || new Date(),
    });
    return doc.toObject<IShipmentEvent>();
  }

  async findShipmentEvents(shipmentId: string): Promise<IShipmentEvent[]> {
    return ShipmentEventModel.find({ shipmentId })
      .sort({ eventTime: 1 })
      .lean<IShipmentEvent[]>();
  }

  async hasShipmentEvent(shipmentId: string, providerEventId: string): Promise<boolean> {
    const count = await ShipmentEventModel.countDocuments({
      shipmentId,
      providerEventId,
    });
    return count > 0;
  }

  // ── Webhook Event Operations ──────────────────────────────────────────────

  async recordWebhookEvent(data: Partial<IShippingWebhookEvent>): Promise<IShippingWebhookEvent> {
    const doc = await ShippingWebhookEventModel.create({
      ...data,
      receivedAt: data.receivedAt || new Date(),
    });
    return doc.toObject<IShippingWebhookEvent>();
  }

  async findWebhookEvent(provider: string, eventId: string): Promise<IShippingWebhookEvent | null> {
    return ShippingWebhookEventModel.findOne({ provider, eventId }).lean<IShippingWebhookEvent>();
  }

  async updateWebhookEventStatus(
    id: string,
    status: "PROCESSED" | "FAILED" | "DUPLICATE",
    error?: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await ShippingWebhookEventModel.findByIdAndUpdate(id, {
      $set: {
        status,
        processedAt: new Date(),
        ...(error ? { error } : {}),
      },
    });
  }
}

export const fulfillmentRepository = new FulfillmentRepository();
