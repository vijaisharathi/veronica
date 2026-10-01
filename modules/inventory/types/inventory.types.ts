import {
  InventoryStatus,
  StockMovementType,
  StockAdjustmentReason,
  StockReservationStatus,
  WarehouseStatus,
} from "@/constants/status";
import { IWarehouseAddress, IWarehouseContact } from "@/types/database";

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  address: IWarehouseAddress;
  contact: IWarehouseContact;
  status: WarehouseStatus;
  active: boolean;
  operatingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDto {
  id: string;
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  productId?: string;
  productName?: string;
  variantId: string;
  sku?: string;
  color?: string;
  size?: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: InventoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementDto {
  id: string;
  warehouseId: string;
  warehouseCode?: string;
  variantId: string;
  sku?: string;
  type: StockMovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceType: string;
  referenceId: string;
  reason?: string;
  adjustmentReason?: StockAdjustmentReason | null;
  performedBy: string;
  timestamp: string;
}

export interface StockReservationDto {
  id: string;
  reservationId: string;
  referenceType: string;
  referenceId: string;
  variantId: string;
  sku?: string;
  warehouseId: string;
  warehouseCode?: string;
  quantity: number;
  status: StockReservationStatus;
  expiresAt: string;
  releasedAt?: string | null;
  consumedAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface VariantAvailabilityDto {
  variantId: string;
  sku?: string;
  isAvailable: boolean;
  isLowStock: boolean;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  totalAvailable?: number; // Only included if admin or internal flag
}

export interface VariantMatrixEntry {
  variantId: string;
  color: string;
  size: string;
  sku: string;
  isAvailable: boolean;
  isLowStock: boolean;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface ProductAvailabilityMatrixDto {
  productId: string;
  variants: VariantMatrixEntry[];
  matrix: Record<string, Record<string, { variantId: string; isAvailable: boolean; isLowStock: boolean; stockStatus: string }>>;
}

export interface ReceiveStockInput {
  warehouseId: string;
  variantId: string;
  quantity: number;
  notes?: string;
  sku?: string;
  productId?: string;
}

export interface AdjustStockInput {
  warehouseId: string;
  variantId: string;
  quantityDelta: number;
  reason: StockAdjustmentReason;
  notes?: string;
}

export interface ReserveStockInput {
  variantId: string;
  warehouseId?: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  expiresInMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface ReleaseStockInput {
  reservationId?: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
}

export interface ConsumeStockInput {
  reservationId?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface WarehouseAllocationItem {
  variantId: string;
  quantity: number;
}

export interface ItemAllocation {
  variantId: string;
  warehouseId: string;
  warehouseCode: string;
  quantity: number;
}

export interface WarehouseAllocationResult {
  success: boolean;
  allocations: ItemAllocation[];
  unavailableVariantIds?: string[];
  reason?: string;
}

export interface InventoryListFilters {
  warehouseId?: string;
  productId?: string;
  status?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MovementListFilters {
  warehouseId?: string;
  variantId?: string;
  type?: string;
  referenceId?: string;
  page?: number;
  limit?: number;
}

export interface ReservationListFilters {
  warehouseId?: string;
  variantId?: string;
  status?: string;
  referenceId?: string;
  page?: number;
  limit?: number;
}
