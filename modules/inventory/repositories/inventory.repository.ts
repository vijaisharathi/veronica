import {
  InventoryItemModel,
  StockMovementModel,
  StockReservationModel,
} from "@/db/models";
import {
  IInventoryItem,
  IStockMovement,
  IStockReservation,
} from "@/types/database";
import {
  InventoryStatus,
  StockMovementType,
  StockAdjustmentReason,
  StockReservationStatus,
} from "@/constants/status";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { ClientSession, Types } from "mongoose";

export interface RecordMovementParams {
  warehouseId: string;
  variantId: string;
  type: StockMovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceType: string;
  referenceId: string;
  reason?: string;
  adjustmentReason?: StockAdjustmentReason | null;
  performedBy: string;
}

export class InventoryRepository {
  /**
   * Get specific stock record for a variant at a warehouse
   */
  async getWarehouseStock(
    warehouseId: string,
    variantId: string
  ): Promise<IInventoryItem | null> {
    return InventoryItemModel.findOne({
      warehouseId: new Types.ObjectId(warehouseId),
      variantId: new Types.ObjectId(variantId),
    }).lean<IInventoryItem>();
  }

  /**
   * Get all warehouse stock records for a given variant
   */
  async getVariantStockAcrossWarehouses(variantId: string): Promise<IInventoryItem[]> {
    return InventoryItemModel.find({
      variantId: new Types.ObjectId(variantId),
    }).lean<IInventoryItem[]>();
  }

  /**
   * Calculate aggregated available stock for a variant across all warehouses
   */
  async getVariantTotalAvailableStock(variantId: string): Promise<number> {
    const items = await this.getVariantStockAcrossWarehouses(variantId);
    return items.reduce(
      (acc, item) =>
        acc + Math.max(0, (item.quantityOnHand ?? item.availableQuantity) - (item.quantityReserved ?? item.reservedQuantity ?? 0)),
      0
    );
  }

  /**
   * Fetch stock records for multiple variant IDs in batch (prevents N+1)
   */
  async getBatchVariantStock(variantIds: string[]): Promise<IInventoryItem[]> {
    const objectIds = variantIds.map((id) => new Types.ObjectId(id));
    return InventoryItemModel.find({
      variantId: { $in: objectIds },
    }).lean<IInventoryItem[]>();
  }

  /**
   * Atomically receive stock into a warehouse for a variant
   */
  async receiveStock(
    params: {
      warehouseId: string;
      variantId: string;
      productId?: string;
      sku?: string;
      quantity: number;
      performedBy: string;
      notes?: string;
    },
    session?: ClientSession
  ): Promise<{ item: IInventoryItem; movement: IStockMovement }> {
    const { warehouseId, variantId, productId, sku, quantity, performedBy, notes } = params;

    const wId = new Types.ObjectId(warehouseId);
    const vId = new Types.ObjectId(variantId);
    const pId = productId ? new Types.ObjectId(productId) : undefined;

    // Fetch before state
    const beforeItem = await InventoryItemModel.findOne({ warehouseId: wId, variantId: vId }).session(session || null);
    const beforeOnHand = beforeItem ? beforeItem.quantityOnHand : 0;
    const currentReserved = beforeItem ? beforeItem.quantityReserved : 0;
    const afterOnHand = beforeOnHand + quantity;
    const afterAvailable = afterOnHand - currentReserved;

    const lowStockLevel = beforeItem?.lowStockThreshold ?? 5;
    let nextStatus: InventoryStatus = InventoryStatus.IN_STOCK;
    if (afterAvailable <= 0) {
      nextStatus = InventoryStatus.OUT_OF_STOCK;
    } else if (afterAvailable <= lowStockLevel) {
      nextStatus = InventoryStatus.LOW_STOCK;
    }

    const updatedDoc = await InventoryItemModel.findOneAndUpdate(
      { warehouseId: wId, variantId: vId },
      {
        $inc: {
          quantityOnHand: quantity,
          availableQuantity: quantity,
        },
        $set: {
          status: nextStatus,
          ...(pId ? { productId: pId } : {}),
          ...(sku ? { sku } : {}),
        },
        $setOnInsert: {
          quantityReserved: 0,
          reservedQuantity: 0,
          damagedQuantity: 0,
          incomingQuantity: 0,
          lowStockThreshold: 5,
          reorderLevel: 5,
        },
      },
      {
        new: true,
        upsert: true,
        session,
        runValidators: true,
      }
    );

    if (!updatedDoc) {
      throw new AppError("Failed to update inventory record on stock receipt", "INVENTORY_RECEIVE_FAILED", 500);
    }

    const movement = await this.recordMovement(
      {
        warehouseId,
        variantId,
        type: StockMovementType.RECEIPT,
        quantity,
        beforeQuantity: beforeOnHand,
        afterQuantity: afterOnHand,
        referenceType: "STOCK_RECEIPT",
        referenceId: `RCV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        reason: notes || "Standard stock intake",
        performedBy,
      },
      session
    );

    return {
      item: updatedDoc.toObject<IInventoryItem>(),
      movement,
    };
  }

  /**
   * Atomically adjust stock with structured reason and strict non-negative check
   */
  async adjustStock(
    params: {
      warehouseId: string;
      variantId: string;
      quantityDelta: number;
      reason: StockAdjustmentReason;
      performedBy: string;
      notes?: string;
    },
    session?: ClientSession
  ): Promise<{ item: IInventoryItem; movement: IStockMovement }> {
    const { warehouseId, variantId, quantityDelta, reason, performedBy, notes } = params;
    const wId = new Types.ObjectId(warehouseId);
    const vId = new Types.ObjectId(variantId);

    const existingItem = await InventoryItemModel.findOne({ warehouseId: wId, variantId: vId }).session(session || null);
    if (!existingItem) {
      throw new NotFoundError(
        `Inventory record for variant ${variantId} at warehouse ${warehouseId} not found`
      );
    }

    const beforeOnHand = existingItem.quantityOnHand;
    const reserved = existingItem.quantityReserved;
    const newOnHand = beforeOnHand + quantityDelta;

    if (newOnHand < 0) {
      throw new AppError(
        `Invalid adjustment: resulting on-hand quantity (${newOnHand}) cannot be negative`,
        "INVENTORY_INVARIANT_VIOLATION",
        400
      );
    }

    if (newOnHand < reserved) {
      throw new ConflictError(
        `Cannot adjust stock below active reservations. On-hand: ${newOnHand}, Reserved: ${reserved}`
      );
    }

    const newAvailable = newOnHand - reserved;
    const threshold = existingItem.lowStockThreshold || 5;
    let nextStatus: InventoryStatus = InventoryStatus.IN_STOCK;
    if (newAvailable <= 0) {
      nextStatus = InventoryStatus.OUT_OF_STOCK;
    } else if (newAvailable <= threshold) {
      nextStatus = InventoryStatus.LOW_STOCK;
    }

    const updatedDoc = await InventoryItemModel.findOneAndUpdate(
      {
        _id: existingItem._id,
        quantityOnHand: beforeOnHand, // Optimistic concurrency check
      },
      {
        $set: {
          quantityOnHand: newOnHand,
          availableQuantity: newAvailable,
          status: nextStatus,
        },
      },
      { new: true, session, runValidators: true }
    );

    if (!updatedDoc) {
      throw new ConflictError("Inventory item was modified concurrently. Please refresh and retry adjustment.");
    }

    const movementType =
      quantityDelta > 0
        ? StockMovementType.ADJUSTMENT_IN
        : StockMovementType.ADJUSTMENT_OUT;

    const movement = await this.recordMovement(
      {
        warehouseId,
        variantId,
        type: movementType,
        quantity: Math.abs(quantityDelta),
        beforeQuantity: beforeOnHand,
        afterQuantity: newOnHand,
        referenceType: "STOCK_ADJUSTMENT",
        referenceId: `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        reason: notes || `Stock adjusted due to ${reason}`,
        adjustmentReason: reason,
        performedBy,
      },
      session
    );

    return {
      item: updatedDoc.toObject<IInventoryItem>(),
      movement,
    };
  }

  /**
   * Atomically reserve stock for checkout or order
   */
  async reserveStock(
    params: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      referenceType: string;
      referenceId: string;
      expiresAt: Date;
      reservationId: string;
      performedBy?: string;
      metadata?: Record<string, unknown>;
    },
    session?: ClientSession
  ): Promise<{ reservation: IStockReservation; movement: IStockMovement }> {
    const {
      warehouseId,
      variantId,
      quantity,
      referenceType,
      referenceId,
      expiresAt,
      reservationId,
      performedBy = "SYSTEM",
      metadata = {},
    } = params;

    const wId = new Types.ObjectId(warehouseId);
    const vId = new Types.ObjectId(variantId);

    // Atomic update with precondition: availableQuantity >= quantity
    const updated = await InventoryItemModel.findOneAndUpdate(
      {
        warehouseId: wId,
        variantId: vId,
        availableQuantity: { $gte: quantity },
      },
      {
        $inc: {
          quantityReserved: quantity,
          reservedQuantity: quantity,
          availableQuantity: -quantity,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      throw new ConflictError(
        `Insufficient available stock for variant ${variantId} at warehouse ${warehouseId}`
      );
    }

    // Update status if inventory reached low/out of stock
    if (updated.availableQuantity <= 0) {
      await InventoryItemModel.updateOne(
        { _id: updated._id },
        { $set: { status: InventoryStatus.OUT_OF_STOCK } },
        { session }
      );
    } else if (updated.availableQuantity <= updated.lowStockThreshold) {
      await InventoryItemModel.updateOne(
        { _id: updated._id },
        { $set: { status: InventoryStatus.LOW_STOCK } },
        { session }
      );
    }

    // Create reservation document
    const reservationDocs = await StockReservationModel.create(
      [
        {
          reservationId,
          referenceType,
          referenceId,
          variantId: vId,
          warehouseId: wId,
          quantity,
          status: StockReservationStatus.ACTIVE,
          expiresAt,
          metadata,
        },
      ],
      session ? { session } : {}
    );

    if (!reservationDocs[0]) {
      throw new AppError("Failed to persist stock reservation document", "RESERVATION_PERSIST_FAILED", 500);
    }

    const reservation = reservationDocs[0].toObject<IStockReservation>();

    // Record movement
    const movement = await this.recordMovement(
      {
        warehouseId,
        variantId,
        type: StockMovementType.RESERVATION,
        quantity,
        beforeQuantity: updated.availableQuantity + quantity,
        afterQuantity: updated.availableQuantity,
        referenceType,
        referenceId,
        reason: `Reserved ${quantity} units for ${referenceType} ${referenceId}`,
        performedBy,
      },
      session
    );

    return { reservation, movement };
  }

  /**
   * Release an active reservation idempotently
   */
  async releaseReservation(
    reservationId: string,
    actor = "SYSTEM",
    reason = "Reservation released",
    session?: ClientSession
  ): Promise<{ reservation: IStockReservation; movement?: IStockMovement }> {
    const reservation = await StockReservationModel.findOne({ reservationId }).session(session || null);
    if (!reservation) {
      throw new NotFoundError("StockReservation", reservationId);
    }

    // Idempotency: if already released or cancelled, no-op
    if (
      reservation.status === StockReservationStatus.RELEASED ||
      reservation.status === StockReservationStatus.CANCELLED ||
      reservation.status === StockReservationStatus.EXPIRED
    ) {
      return { reservation: reservation.toObject<IStockReservation>() };
    }

    if (reservation.status === StockReservationStatus.CONSUMED) {
      throw new ConflictError("Cannot release an already consumed stock reservation");
    }

    // Atomically transition reservation status
    const updatedRes = await StockReservationModel.findOneAndUpdate(
      {
        _id: reservation._id,
        status: StockReservationStatus.ACTIVE,
      },
      {
        $set: {
          status: StockReservationStatus.RELEASED,
          releasedAt: new Date(),
        },
      },
      { new: true, session }
    );

    if (!updatedRes) {
      // Race condition check: another concurrent call released it
      const current = await StockReservationModel.findById(reservation._id).session(session || null);
      return { reservation: current!.toObject<IStockReservation>() };
    }

    // Decrement reserved and restore available
    const item = await InventoryItemModel.findOneAndUpdate(
      {
        warehouseId: reservation.warehouseId,
        variantId: reservation.variantId,
      },
      {
        $inc: {
          quantityReserved: -reservation.quantity,
          reservedQuantity: -reservation.quantity,
          availableQuantity: reservation.quantity,
        },
      },
      { new: true, session }
    );

    if (item) {
      const threshold = item.lowStockThreshold || 5;
      const status =
        item.availableQuantity <= 0
          ? InventoryStatus.OUT_OF_STOCK
          : item.availableQuantity <= threshold
          ? InventoryStatus.LOW_STOCK
          : InventoryStatus.IN_STOCK;
      await InventoryItemModel.updateOne({ _id: item._id }, { $set: { status } }, { session });
    }

    const movement = await this.recordMovement(
      {
        warehouseId: reservation.warehouseId.toString(),
        variantId: reservation.variantId.toString(),
        type: StockMovementType.RELEASE,
        quantity: reservation.quantity,
        beforeQuantity: item ? item.availableQuantity - reservation.quantity : 0,
        afterQuantity: item ? item.availableQuantity : 0,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        reason,
        performedBy: actor,
      },
      session
    );

    return {
      reservation: updatedRes.toObject<IStockReservation>(),
      movement,
    };
  }

  /**
   * Consume an active reservation upon order confirmation
   */
  async consumeReservation(
    reservationId: string,
    actor = "SYSTEM",
    session?: ClientSession
  ): Promise<{ reservation: IStockReservation; movement?: IStockMovement }> {
    const reservation = await StockReservationModel.findOne({ reservationId }).session(session || null);
    if (!reservation) {
      throw new NotFoundError("StockReservation", reservationId);
    }

    // Idempotency check: if already consumed, return directly
    if (reservation.status === StockReservationStatus.CONSUMED) {
      return { reservation: reservation.toObject<IStockReservation>() };
    }

    if (reservation.status !== StockReservationStatus.ACTIVE) {
      throw new ConflictError(
        `Cannot consume reservation '${reservationId}' with status ${reservation.status}`
      );
    }

    const updatedRes = await StockReservationModel.findOneAndUpdate(
      {
        _id: reservation._id,
        status: StockReservationStatus.ACTIVE,
      },
      {
        $set: {
          status: StockReservationStatus.CONSUMED,
          consumedAt: new Date(),
        },
      },
      { new: true, session }
    );

    if (!updatedRes) {
      const current = await StockReservationModel.findById(reservation._id).session(session || null);
      return { reservation: current!.toObject<IStockReservation>() };
    }

    // Deduct onHand and quantityReserved
    const item = await InventoryItemModel.findOneAndUpdate(
      {
        warehouseId: reservation.warehouseId,
        variantId: reservation.variantId,
      },
      {
        $inc: {
          quantityOnHand: -reservation.quantity,
          quantityReserved: -reservation.quantity,
          reservedQuantity: -reservation.quantity,
        },
      },
      { new: true, session }
    );

    if (item) {
      const threshold = item.lowStockThreshold || 5;
      const status =
        item.availableQuantity <= 0
          ? InventoryStatus.OUT_OF_STOCK
          : item.availableQuantity <= threshold
          ? InventoryStatus.LOW_STOCK
          : InventoryStatus.IN_STOCK;
      await InventoryItemModel.updateOne({ _id: item._id }, { $set: { status } }, { session });
    }

    const movement = await this.recordMovement(
      {
        warehouseId: reservation.warehouseId.toString(),
        variantId: reservation.variantId.toString(),
        type: StockMovementType.SALE,
        quantity: reservation.quantity,
        beforeQuantity: item ? item.quantityOnHand + reservation.quantity : 0,
        afterQuantity: item ? item.quantityOnHand : 0,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        reason: `Sold and consumed for ${reservation.referenceType} ${reservation.referenceId}`,
        performedBy: actor,
      },
      session
    );

    return {
      reservation: updatedRes.toObject<IStockReservation>(),
      movement,
    };
  }

  /**
   * Find expired active reservations
   */
  async findExpiredReservations(limit = 100): Promise<IStockReservation[]> {
    return StockReservationModel.find({
      status: StockReservationStatus.ACTIVE,
      expiresAt: { $lte: new Date() },
    })
      .limit(limit)
      .lean<IStockReservation[]>();
  }

  /**
   * Expire an active reservation
   */
  async expireReservation(
    reservationId: string,
    session?: ClientSession
  ): Promise<{ reservation: IStockReservation; movement?: IStockMovement }> {
    const reservation = await StockReservationModel.findOne({ reservationId }).session(session || null);
    if (!reservation || reservation.status !== StockReservationStatus.ACTIVE) {
      return { reservation: (reservation ? reservation.toObject<IStockReservation>() : null)! };
    }

    const updatedRes = await StockReservationModel.findOneAndUpdate(
      {
        _id: reservation._id,
        status: StockReservationStatus.ACTIVE,
      },
      {
        $set: {
          status: StockReservationStatus.EXPIRED,
          releasedAt: new Date(),
        },
      },
      { new: true, session }
    );

    if (!updatedRes) {
      return { reservation: reservation.toObject<IStockReservation>() };
    }

    const item = await InventoryItemModel.findOneAndUpdate(
      {
        warehouseId: reservation.warehouseId,
        variantId: reservation.variantId,
      },
      {
        $inc: {
          quantityReserved: -reservation.quantity,
          reservedQuantity: -reservation.quantity,
          availableQuantity: reservation.quantity,
        },
      },
      { new: true, session }
    );

    if (item) {
      const threshold = item.lowStockThreshold || 5;
      const status =
        item.availableQuantity <= 0
          ? InventoryStatus.OUT_OF_STOCK
          : item.availableQuantity <= threshold
          ? InventoryStatus.LOW_STOCK
          : InventoryStatus.IN_STOCK;
      await InventoryItemModel.updateOne({ _id: item._id }, { $set: { status } }, { session });
    }

    const movement = await this.recordMovement(
      {
        warehouseId: reservation.warehouseId.toString(),
        variantId: reservation.variantId.toString(),
        type: StockMovementType.RELEASE,
        quantity: reservation.quantity,
        beforeQuantity: item ? item.availableQuantity - reservation.quantity : 0,
        afterQuantity: item ? item.availableQuantity : 0,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        reason: "Automatic release of expired reservation",
        performedBy: "SYSTEM_RESERVATION_EXPIRY_WORKER",
      },
      session
    );

    return {
      reservation: updatedRes.toObject<IStockReservation>(),
      movement,
    };
  }

  /**
   * Find reservation by reservationId
   */
  async findReservationById(reservationId: string): Promise<IStockReservation | null> {
    return StockReservationModel.findOne({ reservationId }).lean<IStockReservation>();
  }

  /**
   * Find reservations by referenceType and referenceId
   */
  async findReservationsByReference(
    referenceType: string,
    referenceId: string
  ): Promise<IStockReservation[]> {
    return StockReservationModel.find({ referenceType, referenceId }).lean<IStockReservation[]>();
  }

  /**
   * Find active reservations for a variant (supports legacy test interface)
   */
  async getActiveReservations(variantId: string): Promise<IStockReservation[]> {
    return StockReservationModel.find({
      variantId: new Types.ObjectId(variantId),
      status: StockReservationStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    }).lean<IStockReservation[]>();
  }

  /**
   * Record an immutable stock movement
   */
  async recordMovement(
    data: RecordMovementParams,
    session?: ClientSession
  ): Promise<IStockMovement> {
    const docs = await StockMovementModel.create(
      [
        {
          warehouseId: new Types.ObjectId(data.warehouseId),
          variantId: new Types.ObjectId(data.variantId),
          type: data.type,
          quantity: data.quantity,
          beforeQuantity: data.beforeQuantity,
          afterQuantity: data.afterQuantity,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          reason: data.reason,
          adjustmentReason: data.adjustmentReason || null,
          performedBy: data.performedBy,
          timestamp: new Date(),
        },
      ],
      session ? { session } : {}
    );

    if (!docs[0]) {
      throw new AppError("Failed to record stock movement", "STOCK_MOVEMENT_CREATE_FAILED", 500);
    }
    return docs[0].toObject<IStockMovement>();
  }

  /**
   * Fetch recent stock audit movements for a variant (supports legacy test interface)
   */
  async getStockMovements(variantId: string, limit = 50): Promise<IStockMovement[]> {
    return StockMovementModel.find({ variantId: new Types.ObjectId(variantId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean<IStockMovement[]>();
  }

  /**
   * List inventory items with filtering & pagination
   */
  async listInventoryItems(params: {
    warehouseId?: string;
    productId?: string;
    status?: string;
    lowStockOnly?: boolean;
    outOfStockOnly?: boolean;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: IInventoryItem[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (params.warehouseId) {
      filter.warehouseId = new Types.ObjectId(params.warehouseId);
    }
    if (params.productId) {
      filter.productId = new Types.ObjectId(params.productId);
    }
    if (params.status) {
      filter.status = params.status;
    }
    if (params.lowStockOnly) {
      filter.status = InventoryStatus.LOW_STOCK;
    }
    if (params.outOfStockOnly) {
      filter.status = InventoryStatus.OUT_OF_STOCK;
    }
    if (params.search) {
      filter.$or = [
        { sku: new RegExp(params.search, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      InventoryItemModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(params.skip || 0)
        .limit(params.limit || 50)
        .lean<IInventoryItem[]>(),
      InventoryItemModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * List movement audit log
   */
  async listMovements(params: {
    warehouseId?: string;
    variantId?: string;
    type?: string;
    referenceId?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ movements: IStockMovement[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (params.warehouseId) {
      filter.warehouseId = new Types.ObjectId(params.warehouseId);
    }
    if (params.variantId) {
      filter.variantId = new Types.ObjectId(params.variantId);
    }
    if (params.type) {
      filter.type = params.type;
    }
    if (params.referenceId) {
      filter.referenceId = params.referenceId;
    }

    const [movements, total] = await Promise.all([
      StockMovementModel.find(filter)
        .sort({ timestamp: -1 })
        .skip(params.skip || 0)
        .limit(params.limit || 50)
        .lean<IStockMovement[]>(),
      StockMovementModel.countDocuments(filter),
    ]);

    return { movements, total };
  }

  /**
   * List reservations
   */
  async listReservations(params: {
    warehouseId?: string;
    variantId?: string;
    status?: string;
    referenceId?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ reservations: IStockReservation[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (params.warehouseId) {
      filter.warehouseId = new Types.ObjectId(params.warehouseId);
    }
    if (params.variantId) {
      filter.variantId = new Types.ObjectId(params.variantId);
    }
    if (params.status) {
      filter.status = params.status;
    }
    if (params.referenceId) {
      filter.referenceId = params.referenceId;
    }

    const [reservations, total] = await Promise.all([
      StockReservationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(params.skip || 0)
        .limit(params.limit || 50)
        .lean<IStockReservation[]>(),
      StockReservationModel.countDocuments(filter),
    ]);

    return { reservations, total };
  }
}

export const inventoryRepository = new InventoryRepository();
