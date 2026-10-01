/**
 * VÉRONA — Returns & Exchanges Domain Types & DTOs (Phase 22)
 */

import {
  ReturnStatus,
  ExchangeStatus,
  ReturnType,
  ReturnReason,
  ReturnMethod,
  InspectionResult,
  ReturnItemCondition,
  ReturnDisposition,
  ReturnPickupFailureReason,
} from "@/constants/status";
import { IOrderAddressSnapshot, MinorUnits } from "@/types/database";

// ── Customer DTO ─────────────────────────────────────────────────────────────

export interface ReturnItemCustomerDto {
  orderItemId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPriceMinor: MinorUnits;
  reason: ReturnReason;
  condition?: string;
}

export interface ReturnCustomerDto {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber?: string;
  type: ReturnType;
  status: ReturnStatus;
  reason: ReturnReason;
  description?: string;
  evidenceImages: string[];
  pickupAddressSnapshot: IOrderAddressSnapshot;
  items: ReturnItemCustomerDto[];
  tracking?: {
    provider: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status: string;
    scheduledPickupDate?: string;
    actualPickupDate?: string;
  };
  timeline: {
    requestedAt: string;
    approvedAt?: string;
    pickedUpAt?: string;
    receivedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeCustomerDto {
  id: string;
  exchangeNumber: string;
  returnRequestId?: string;
  orderId: string;
  orderNumber?: string;
  originalItem: {
    orderItemId: string;
    variantId: string;
    productId?: string;
    sku?: string;
    productName?: string;
    size?: string;
    color?: string;
    quantity: number;
  };
  replacementItem: {
    variantId: string;
    productId?: string;
    sku?: string;
    productName?: string;
    size?: string;
    color?: string;
    quantity: number;
  };
  reason: ReturnReason;
  status: ExchangeStatus;
  timeline: {
    requestedAt: string;
    approvedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
  };
  fulfillment?: {
    fulfillmentId?: string;
    replacementOrderId?: string;
  };
  createdAt: string;
}

// ── Admin / Staff DTO ────────────────────────────────────────────────────────

export interface ReturnItemAdminDto extends ReturnItemCustomerDto {
  inspectionResult?: InspectionResult;
  inspectionNotes?: string;
  disposition?: ReturnDisposition;
}

export interface ReturnAdminDto extends ReturnCustomerDto {
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  warehouseId?: string;
  warehouseCode?: string;
  warehouseName?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  receivedBy?: string;
  inspectedBy?: string;
  cancelledBy?: string;
  refundRequestedAt?: string;
  items: ReturnItemAdminDto[];
  policySnapshot?: {
    returnWindowDays: number;
    deliveredAt: string;
    policyVersion: string;
    eligibleAmountMinor: MinorUnits;
  };
  metadata?: Record<string, unknown>;
}

export interface ExchangeAdminDto extends ExchangeCustomerDto {
  customerId: string;
  customerEmail?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  cancelledBy?: string;
  reservationId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// ── Service Input Types ──────────────────────────────────────────────────────

export interface CreateReturnItemInput {
  orderItemId: string;
  quantity: number;
  reason: ReturnReason;
  condition?: ReturnItemCondition | string;
}

export interface CreateReturnRequestInput {
  orderId: string;
  customerId?: string;
  type?: ReturnType;
  reason: ReturnReason;
  description?: string;
  evidenceImages?: string[];
  items: CreateReturnItemInput[];
  returnMethod?: ReturnMethod;
  pickupAddressId?: string;
  pickupAddressSnapshot?: IOrderAddressSnapshot;
}

export interface CreateExchangeRequestInput {
  orderId: string;
  customerId?: string;
  originalOrderItemId: string;
  requestedVariantId: string;
  quantity: number;
  reason: ReturnReason;
  description?: string;
  evidenceImages?: string[];
  pickupAddressId?: string;
  pickupAddressSnapshot?: IOrderAddressSnapshot;
}

export interface ReviewReturnInput {
  approved: boolean;
  rejectionReason?: string;
  warehouseId?: string;
  notes?: string;
}

export interface SchedulePickupInput {
  scheduledDate?: Date | string;
  provider?: string;
  instructions?: string;
}

export interface ConfirmPickupInput {
  actualDate?: Date | string;
  trackingNumber?: string;
  notes?: string;
}

export interface ReceiveReturnInput {
  warehouseId: string;
  packageReference?: string;
  notes?: string;
}

export interface InspectionItemInput {
  orderItemId: string;
  result: InspectionResult;
  condition: ReturnItemCondition | string;
  notes?: string;
  disposition?: ReturnDisposition;
}

export interface CompleteInspectionInput {
  items: InspectionItemInput[];
  notes?: string;
}

export interface ItemDispositionInput {
  orderItemId: string;
  disposition: ReturnDisposition;
  notes?: string;
}

export interface AssignDispositionInput {
  items: ItemDispositionInput[];
  notes?: string;
}

// ── Eligibility Types ────────────────────────────────────────────────────────

export interface ItemEligibilityResult {
  orderItemId: string;
  variantId: string;
  productId: string;
  productName: string;
  orderedQuantity: number;
  alreadyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  unitPriceMinor: MinorUnits;
  isReturnable: boolean;
  isFinalSale: boolean;
  isEligible: boolean;
  ineligibleReason?: string;
}

export interface OrderEligibilityResult {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  isDelivered: boolean;
  deliveredAt: Date | null;
  returnWindowDays: number;
  windowExpiresAt: Date | null;
  isWithinWindow: boolean;
  isEligible: boolean;
  items: ItemEligibilityResult[];
  ineligibleReason?: string;
}

// ── Filter / Query Types ─────────────────────────────────────────────────────

export interface ReturnFilters {
  status?: ReturnStatus;
  type?: ReturnType;
  orderId?: string;
  customerId?: string;
  warehouseId?: string;
  search?: string;
  reason?: ReturnReason;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface ExchangeFilters {
  status?: ExchangeStatus;
  orderId?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
