import { warehouseRepository } from "../repositories/warehouse.repository";
import { inventoryRepository } from "../repositories/inventory.repository";
import {
  WarehouseAllocationItem,
  WarehouseAllocationResult,
  ItemAllocation,
} from "../types/inventory.types";
import { logger } from "@/lib/logger";

export class WarehouseAllocationService {
  /**
   * Deterministically allocates order items to active warehouses with available stock.
   *
   * Strategy:
   * 1. Retrieve all active operational warehouses.
   * 2. Single-Warehouse Optimization: If one active warehouse can fulfill all requested items,
   *    select it to avoid splitting fulfillment.
   * 3. Multi-Warehouse Fallback: If no single warehouse has all items, assign each item to
   *    the active warehouse with the maximum available stock for that variant.
   * 4. If any item has insufficient available stock across all active warehouses, fail with INVENTORY_UNAVAILABLE.
   */
  async allocate(
    items: WarehouseAllocationItem[],
    destinationPincode?: string
  ): Promise<WarehouseAllocationResult> {
    if (!items || items.length === 0) {
      return {
        success: true,
        allocations: [],
      };
    }

    // 1. Fetch active warehouses
    const activeWarehouses = await warehouseRepository.findActiveWarehouses();
    if (activeWarehouses.length === 0) {
      logger.warn("Warehouse allocation failed: No active warehouses found in system");
      return {
        success: false,
        allocations: [],
        unavailableVariantIds: items.map((i) => i.variantId),
        reason: "No active warehouses available for fulfillment",
      };
    }

    const warehouseMap = new Map(activeWarehouses.map((w) => [w._id.toString(), w]));
    const activeWarehouseIds = new Set(activeWarehouses.map((w) => w._id.toString()));

    // 2. Fetch inventory for all requested variants
    const variantIds = items.map((i) => i.variantId);
    const stockRecords = await inventoryRepository.getBatchVariantStock(variantIds);

    // Group stock by variantId -> warehouseId -> availableQuantity
    const variantWarehouseStock = new Map<string, Map<string, number>>();
    for (const record of stockRecords) {
      const vId = record.variantId.toString();
      const wId = record.warehouseId.toString();

      if (!activeWarehouseIds.has(wId)) {
        continue; // Skip inactive warehouses
      }

      const available = Math.max(
        0,
        (record.quantityOnHand ?? record.availableQuantity) -
          (record.quantityReserved ?? record.reservedQuantity ?? 0)
      );

      if (!variantWarehouseStock.has(vId)) {
        variantWarehouseStock.set(vId, new Map());
      }
      variantWarehouseStock.get(vId)!.set(wId, available);
    }

    // 3. Check Single-Warehouse Feasibility
    for (const wh of activeWarehouses) {
      const whId = wh._id.toString();
      let canFulfillAll = true;

      for (const item of items) {
        const whStock = variantWarehouseStock.get(item.variantId)?.get(whId) || 0;
        if (whStock < item.quantity) {
          canFulfillAll = false;
          break;
        }
      }

      if (canFulfillAll) {
        const allocations: ItemAllocation[] = items.map((item) => ({
          variantId: item.variantId,
          warehouseId: whId,
          warehouseCode: wh.code,
          quantity: item.quantity,
        }));

        logger.info("Allocated order to single warehouse", {
          context: "WarehouseAllocationService",
          metadata: { warehouseCode: wh.code, itemCount: items.length },
        });

        return {
          success: true,
          allocations,
        };
      }
    }

    // 4. Multi-Warehouse Fallback: Allocate each item to the warehouse with the highest available stock
    const allocations: ItemAllocation[] = [];
    const unavailableVariantIds: string[] = [];

    for (const item of items) {
      const whStockMap = variantWarehouseStock.get(item.variantId);
      if (!whStockMap || whStockMap.size === 0) {
        unavailableVariantIds.push(item.variantId);
        continue;
      }

      // Find active warehouse with maximum available stock for this variant
      let bestWhId: string | null = null;
      let maxStock = -1;

      for (const [whId, available] of whStockMap.entries()) {
        if (available >= item.quantity && available > maxStock) {
          maxStock = available;
          bestWhId = whId;
        }
      }

      if (!bestWhId) {
        unavailableVariantIds.push(item.variantId);
      } else {
        const wh = warehouseMap.get(bestWhId)!;
        allocations.push({
          variantId: item.variantId,
          warehouseId: bestWhId,
          warehouseCode: wh.code,
          quantity: item.quantity,
        });
      }
    }

    if (unavailableVariantIds.length > 0) {
      logger.warn("Warehouse allocation could not fulfill all items", {
        context: "WarehouseAllocationService",
        metadata: { unavailableVariantIds },
      });

      return {
        success: false,
        allocations: [],
        unavailableVariantIds,
        reason: "INVENTORY_UNAVAILABLE: Insufficient stock across all active fulfillment centers",
      };
    }

    return {
      success: true,
      allocations,
    };
  }
}

export const warehouseAllocationService = new WarehouseAllocationService();
