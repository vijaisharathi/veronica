import { inventoryRepository } from "../repositories/inventory.repository";
import { warehouseRepository } from "../repositories/warehouse.repository";
import { warehouseAllocationService } from "./warehouse-allocation.service";
import { reservationService } from "./reservation.service";
import {
  InventoryItemDto,
  StockMovementDto,
  VariantAvailabilityDto,
  ProductAvailabilityMatrixDto,
  VariantMatrixEntry,
  ReceiveStockInput,
  AdjustStockInput,
  InventoryListFilters,
  MovementListFilters,
} from "../types/inventory.types";
import {
  ProductModel,
  ProductVariantModel,
  WarehouseModel,
} from "@/db/models";
import { IInventoryItem, IStockMovement, IOrder, IStaff } from "@/types/database";
import {
  InventoryStatus,
  StockMovementType,
  WarehouseStatus,
} from "@/constants/status";
import { AuthorizationError, ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { Types } from "mongoose";

export class InventoryService {
  /**
   * Safe customer-facing availability check for a single variant.
   * Never leaks exact stock numbers or internal warehouse codes.
   */
  async getVariantAvailability(variantId: string): Promise<VariantAvailabilityDto> {
    const items = await inventoryRepository.getVariantStockAcrossWarehouses(variantId);
    if (items.length === 0) {
      // Requirement 29: Do not mark a variant unavailable merely because it has no inventory record
      return {
        variantId,
        isAvailable: true,
        isLowStock: false,
        stockStatus: "IN_STOCK",
      };
    }

    const totalAvailable = items.reduce(
      (acc, item) =>
        acc + Math.max(0, (item.quantityOnHand ?? item.availableQuantity) - (item.quantityReserved ?? item.reservedQuantity ?? 0)),
      0
    );
    const isAvailable = totalAvailable > 0;
    const isLowStock = isAvailable && totalAvailable <= (items[0]?.lowStockThreshold ?? 5);
    const stockStatus = !isAvailable
      ? "OUT_OF_STOCK"
      : isLowStock
      ? "LOW_STOCK"
      : "IN_STOCK";

    return {
      variantId,
      isAvailable,
      isLowStock,
      stockStatus,
      totalAvailable,
    };
  }

  /**
   * Batch variant availability check (avoids N+1 queries)
   */
  async getBatchVariantAvailability(variantIds: string[]): Promise<Record<string, VariantAvailabilityDto>> {
    if (!variantIds || variantIds.length === 0) {
      return {};
    }

    const records = await inventoryRepository.getBatchVariantStock(variantIds);

    const totals = new Map<string, number>();
    const hasRecords = new Set<string>();

    for (const rec of records) {
      const vId = rec.variantId.toString();
      hasRecords.add(vId);
      const avail = Math.max(
        0,
        (rec.quantityOnHand ?? rec.availableQuantity) -
          (rec.quantityReserved ?? rec.reservedQuantity ?? 0)
      );
      totals.set(vId, (totals.get(vId) || 0) + avail);
    }

    const result: Record<string, VariantAvailabilityDto> = {};
    for (const vId of variantIds) {
      if (!hasRecords.has(vId)) {
        // Requirement 29: default to available when unseeded
        result[vId] = {
          variantId: vId,
          isAvailable: true,
          isLowStock: false,
          stockStatus: "IN_STOCK",
        };
      } else {
        const total = totals.get(vId) || 0;
        const isAvailable = total > 0;
        const isLowStock = isAvailable && total <= 5;
        result[vId] = {
          variantId: vId,
          isAvailable,
          isLowStock,
          stockStatus: !isAvailable ? "OUT_OF_STOCK" : isLowStock ? "LOW_STOCK" : "IN_STOCK",
          totalAvailable: total,
        };
      }
    }

    return result;
  }

  /**
   * Generates a complete Color x Size Garment Availability Matrix for a product
   */
  async getProductAvailabilityMatrix(productId: string): Promise<ProductAvailabilityMatrixDto> {
    const variants = await ProductVariantModel.find({
      productId: new Types.ObjectId(productId),
      active: true,
    }).lean();

    if (!variants || variants.length === 0) {
      return {
        productId,
        variants: [],
        matrix: {},
      };
    }

    const variantIds = variants.map((v) => v._id.toString());
    const availabilityMap = await this.getBatchVariantAvailability(variantIds);

    const variantEntries: VariantMatrixEntry[] = [];
    const matrix: Record<string, Record<string, { variantId: string; isAvailable: boolean; isLowStock: boolean; stockStatus: string }>> = {};

    for (const variant of variants) {
      const vId = variant._id.toString();
      const avail = availabilityMap[vId] || {
        variantId: vId,
        isAvailable: false,
        isLowStock: false,
        stockStatus: "OUT_OF_STOCK",
      };

      const colorName = variant.color?.name || "Standard";
      const sizeName = variant.size || "Standard";

      variantEntries.push({
        variantId: vId,
        color: colorName,
        size: sizeName,
        sku: variant.sku,
        isAvailable: avail.isAvailable,
        isLowStock: avail.isLowStock,
        stockStatus: avail.stockStatus,
      });

      if (!matrix[colorName]) {
        matrix[colorName] = {};
      }

      matrix[colorName][sizeName] = {
        variantId: vId,
        isAvailable: avail.isAvailable,
        isLowStock: avail.isLowStock,
        stockStatus: avail.stockStatus,
      };
    }

    return {
      productId,
      variants: variantEntries,
      matrix,
    };
  }

  /**
   * Receive stock with warehouse scoping & actor recording
   */
  async receiveStock(
    input: ReceiveStockInput,
    actorStaff?: IStaff
  ): Promise<InventoryItemDto> {
    const { warehouseId, variantId, quantity, notes } = input;

    // Enforce warehouse scoping
    this.assertWarehouseScope(warehouseId, actorStaff);

    // Validate warehouse existence and active status
    const warehouse = await warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError("Warehouse", warehouseId);
    }
    if (warehouse.status !== WarehouseStatus.ACTIVE || !warehouse.active) {
      throw new ConflictError(`Cannot receive stock into inactive warehouse: ${warehouse.code}`);
    }

    // Validate variant
    const variant = await ProductVariantModel.findById(variantId).lean();
    if (!variant) {
      throw new NotFoundError("ProductVariant", variantId);
    }

    const actor = actorStaff?.email || "SYSTEM";

    const { item } = await inventoryRepository.receiveStock({
      warehouseId,
      variantId,
      productId: variant.productId.toString(),
      sku: variant.sku,
      quantity,
      performedBy: actor,
      notes,
    });

    logger.info("Stock received successfully", {
      context: "InventoryService",
      metadata: {
        warehouseCode: warehouse.code,
        sku: variant.sku,
        quantity,
        newOnHand: item.quantityOnHand,
        performedBy: actor,
      },
    });

    return this.mapToInventoryItemDto(item, warehouse.code, warehouse.name, variant.sku);
  }

  /**
   * Adjust stock with structured reason, warehouse scoping & validation
   */
  async adjustStock(
    input: AdjustStockInput,
    actorStaff?: IStaff
  ): Promise<InventoryItemDto> {
    const { warehouseId, variantId, quantityDelta, reason, notes } = input;

    // Enforce warehouse scoping
    this.assertWarehouseScope(warehouseId, actorStaff);

    const warehouse = await warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError("Warehouse", warehouseId);
    }

    const variant = await ProductVariantModel.findById(variantId).lean();
    if (!variant) {
      throw new NotFoundError("ProductVariant", variantId);
    }

    const actor = actorStaff?.email || "SYSTEM";

    const { item } = await inventoryRepository.adjustStock({
      warehouseId,
      variantId,
      quantityDelta,
      reason,
      performedBy: actor,
      notes,
    });

    logger.info("Stock adjusted successfully", {
      context: "InventoryService",
      metadata: {
        warehouseCode: warehouse.code,
        sku: variant.sku,
        delta: quantityDelta,
        reason,
        newOnHand: item.quantityOnHand,
        performedBy: actor,
      },
    });

    return this.mapToInventoryItemDto(item, warehouse.code, warehouse.name, variant.sku);
  }

  /**
   * Order Integration: Consume stock upon verified order creation
   */
  async consumeOrderStock(order: IOrder): Promise<void> {
    const orderId = order._id.toString();
    const referenceId = order.orderNumber || orderId;

    logger.info("Consuming stock for confirmed order", {
      context: "InventoryService",
      metadata: { orderId, orderNumber: order.orderNumber, itemCount: order.items.length },
    });

    // 1. Check if there are active checkout reservations for this order
    if (order.checkoutSessionId) {
      const checkoutReservations = await inventoryRepository.findReservationsByReference(
        "CHECKOUT",
        order.checkoutSessionId
      );

      if (checkoutReservations.length > 0) {
        // Consume the existing reservations
        await reservationService.consumeReservation({
          referenceType: "CHECKOUT",
          referenceId: order.checkoutSessionId,
        });
        return;
      }
    }

    // 2. Direct stock allocation & deduction if no pre-reservation existed
    const allocationItems = order.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    const allocation = await warehouseAllocationService.allocate(allocationItems);
    if (!allocation.success) {
      logger.error("Failed to allocate warehouse stock for confirmed order", {
        context: "InventoryService",
        metadata: { orderId, reason: allocation.reason },
      });
      // Do not throw fatal error to block confirmed order, but log and record backorder/warning
      return;
    }

    for (const itemAlloc of allocation.allocations) {
      try {
        // Direct sale deduction
        const { item } = await inventoryRepository.adjustStock({
          warehouseId: itemAlloc.warehouseId,
          variantId: itemAlloc.variantId,
          quantityDelta: -itemAlloc.quantity,
          reason: "OTHER" as any,
          performedBy: "ORDER_CONFIRMATION",
          notes: `Order confirmed: ${referenceId}`,
        });
      } catch (err) {
        logger.error("Error deducting stock for order item", {
          context: "InventoryService",
          metadata: { orderId, itemAlloc, error: String(err) },
        });
      }
    }
  }

  /**
   * Order Integration: Restore stock when order is cancelled
   */
  async restoreOrderStock(
    order: IOrder,
    reason: string,
    performedBy: string
  ): Promise<void> {
    const orderId = order._id.toString();
    const orderNumber = order.orderNumber || orderId;

    logger.info("Restoring stock for cancelled order", {
      context: "InventoryService",
      metadata: { orderId, orderNumber, reason, performedBy },
    });

    // Release any active reservations first
    await reservationService.releaseReservation({
      referenceType: "ORDER",
      referenceId: orderId,
      reason: `Order cancelled: ${reason}`,
    });

    // If order was already confirmed/sold, return items to inventory
    const activeWarehouses = await warehouseRepository.findActiveWarehouses();
    const defaultWarehouseId = activeWarehouses[0]?._id.toString();

    if (!defaultWarehouseId) {
      logger.warn("No active warehouse available to restock cancelled order items", {
        context: "InventoryService",
        metadata: { orderId },
      });
      return;
    }

    for (const item of order.items) {
      try {
        await inventoryRepository.receiveStock({
          warehouseId: defaultWarehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          performedBy,
          notes: `Order cancellation return: ${orderNumber} - ${reason}`,
        });
      } catch (err) {
        logger.error("Failed to restore stock for cancelled order item", {
          context: "InventoryService",
          metadata: { orderId, variantId: item.variantId, error: String(err) },
        });
      }
    }
  }

  /**
   * List inventory items for Admin Dashboard
   */
  async listInventory(
    filters: InventoryListFilters
  ): Promise<{ items: InventoryItemDto[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const { items, total } = await inventoryRepository.listInventoryItems({
      warehouseId: filters.warehouseId,
      productId: filters.productId,
      status: filters.status,
      lowStockOnly: filters.lowStockOnly,
      outOfStockOnly: filters.outOfStockOnly,
      search: filters.search,
      skip,
      limit,
    });

    // Batch enrich with warehouse, product and variant details
    const warehouseIds = Array.from(new Set(items.map((i) => i.warehouseId.toString())));
    const variantIds = Array.from(new Set(items.map((i) => i.variantId.toString())));

    const [warehouses, variants] = await Promise.all([
      WarehouseModel.find({ _id: { $in: warehouseIds.map((id) => new Types.ObjectId(id)) } }).lean(),
      ProductVariantModel.find({ _id: { $in: variantIds.map((id) => new Types.ObjectId(id)) } })
        .populate("productId", "name")
        .lean(),
    ]);

    const whMap = new Map(warehouses.map((w) => [w._id.toString(), w]));
    const varMap = new Map(variants.map((v) => [v._id.toString(), v]));

    const enrichedItems: InventoryItemDto[] = items.map((item) => {
      const wh = whMap.get(item.warehouseId.toString());
      const variant = varMap.get(item.variantId.toString());
      const product = variant?.productId as any;

      return {
        id: item._id.toString(),
        warehouseId: item.warehouseId.toString(),
        warehouseCode: wh?.code || "UNKNOWN",
        warehouseName: wh?.name || "Unknown Warehouse",
        productId: variant?.productId ? (product?._id ? product._id.toString() : variant.productId.toString()) : undefined,
        productName: product?.name || "Garment",
        variantId: item.variantId.toString(),
        sku: variant?.sku || item.sku || "N/A",
        color: variant?.color?.name || "Standard",
        size: variant?.size || "Standard",
        quantityOnHand: item.quantityOnHand ?? item.availableQuantity,
        quantityReserved: item.quantityReserved ?? item.reservedQuantity ?? 0,
        availableQuantity: (item.quantityOnHand ?? item.availableQuantity) - (item.quantityReserved ?? item.reservedQuantity ?? 0),
        lowStockThreshold: item.lowStockThreshold || 5,
        status: item.status || InventoryStatus.IN_STOCK,
        createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
      };
    });

    return {
      items: enrichedItems,
      total,
      page,
      limit,
    };
  }

  /**
   * List movement audit trail for Admin
   */
  async listMovements(
    filters: MovementListFilters
  ): Promise<{ movements: StockMovementDto[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const { movements, total } = await inventoryRepository.listMovements({
      warehouseId: filters.warehouseId,
      variantId: filters.variantId,
      type: filters.type,
      referenceId: filters.referenceId,
      skip,
      limit,
    });

    const warehouseIds = Array.from(new Set(movements.map((m) => m.warehouseId.toString())));
    const variantIds = Array.from(new Set(movements.map((m) => m.variantId.toString())));

    const [warehouses, variants] = await Promise.all([
      WarehouseModel.find({ _id: { $in: warehouseIds.map((id) => new Types.ObjectId(id)) } }).lean(),
      ProductVariantModel.find({ _id: { $in: variantIds.map((id) => new Types.ObjectId(id)) } }).lean(),
    ]);

    const whMap = new Map(warehouses.map((w) => [w._id.toString(), w]));
    const varMap = new Map(variants.map((v) => [v._id.toString(), v]));

    const enrichedMovements: StockMovementDto[] = movements.map((m) => {
      const wh = whMap.get(m.warehouseId.toString());
      const variant = varMap.get(m.variantId.toString());

      return {
        id: m._id.toString(),
        warehouseId: m.warehouseId.toString(),
        warehouseCode: wh?.code || "WH",
        variantId: m.variantId.toString(),
        sku: variant?.sku || "SKU",
        type: m.type,
        quantity: m.quantity,
        beforeQuantity: m.beforeQuantity,
        afterQuantity: m.afterQuantity,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        reason: m.reason,
        adjustmentReason: m.adjustmentReason || null,
        performedBy: m.performedBy,
        timestamp: m.timestamp ? m.timestamp.toISOString() : new Date().toISOString(),
      };
    });

    return {
      movements: enrichedMovements,
      total,
      page,
      limit,
    };
  }

  /**
   * Helper: Enforces server-side warehouse scoping for warehouse staff
   */
  private assertWarehouseScope(warehouseId: string, staff?: IStaff): void {
    if (!staff) {
      return;
    }

    // If staff has an assigned warehouse restriction, they cannot touch other warehouses
    if (staff.assignedWarehouseId && staff.assignedWarehouseId.toString() !== warehouseId) {
      throw new AuthorizationError(
        `Warehouse scope violation: Staff member is restricted to warehouse ${staff.assignedWarehouseId}`
      );
    }
  }

  private mapToInventoryItemDto(
    item: IInventoryItem,
    warehouseCode: string,
    warehouseName: string,
    sku?: string
  ): InventoryItemDto {
    return {
      id: item._id.toString(),
      warehouseId: item.warehouseId.toString(),
      warehouseCode,
      warehouseName,
      variantId: item.variantId.toString(),
      sku,
      quantityOnHand: item.quantityOnHand ?? item.availableQuantity,
      quantityReserved: item.quantityReserved ?? item.reservedQuantity ?? 0,
      availableQuantity: (item.quantityOnHand ?? item.availableQuantity) - (item.quantityReserved ?? item.reservedQuantity ?? 0),
      lowStockThreshold: item.lowStockThreshold || 5,
      status: item.status || InventoryStatus.IN_STOCK,
      createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const inventoryService = new InventoryService();
