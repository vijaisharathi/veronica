/**
 * VÉRONA — Customer, Staff & Platform Administration Data Transfer Objects (Phase 29)
 *
 * Strict, typed DTO definitions preventing internal entity and secret leakage.
 * All financial values are expressed in minor units (paise).
 */

import { CustomerStatus, StaffStatus, SystemSettingsCategory, AuditActorType } from "@/constants/status";
import { Permission } from "@/constants/permissions";

// ==========================================
// Customer DTOs
// ==========================================

export interface AdminCustomerListItemDTO {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  status: CustomerStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  orderCount: number;
  totalSpendMinor: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCustomerAddressDTO {
  id: string;
  type: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isDefault: boolean;
}

export interface AdminCustomerOrderSummaryDTO {
  totalOrders: number;
  totalSpendMinor: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    finalPriceMinor: number;
    createdAt: Date;
  }>;
}

export interface AdminCustomerReturnSummaryDTO {
  totalReturns: number;
  recentReturns: Array<{
    id: string;
    returnNumber: string;
    status: string;
    returnType: string;
    createdAt: Date;
  }>;
}

export interface AdminCustomerRefundSummaryDTO {
  totalRefunds: number;
  totalRefundedMinor: number;
  recentRefunds: Array<{
    id: string;
    refundNumber: string;
    status: string;
    amountMinor: number;
    createdAt: Date;
  }>;
}

export interface AdminCustomerReviewSummaryDTO {
  totalReviews: number;
  publishedReviews: number;
  pendingReviews: number;
  rejectedReviews: number;
  averageRating: number;
}

export interface AdminCustomerSupportSummaryDTO {
  openTickets: number;
  totalTickets: number;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: Date;
  }>;
}

export interface AdminCustomerNotificationSummaryDTO {
  preferences: {
    marketingEmail: boolean;
    marketingSms: boolean;
    marketingWhatsapp: boolean;
  };
  recentNotificationsCount: number;
}

export interface AdminCustomerActivityDTO {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AdminCustomerDetailDTO {
  id: string;
  authProviderId?: string | null;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  profileImage: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  status: CustomerStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  preferences: {
    marketingEmail: boolean;
    marketingSms: boolean;
    marketingWhatsapp: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  addresses: AdminCustomerAddressDTO[];
  orderSummary: AdminCustomerOrderSummaryDTO;
  returnSummary: AdminCustomerReturnSummaryDTO;
  refundSummary: AdminCustomerRefundSummaryDTO;
  reviewSummary: AdminCustomerReviewSummaryDTO;
  supportSummary: AdminCustomerSupportSummaryDTO;
  notificationSummary: AdminCustomerNotificationSummaryDTO;
  activityTimeline: AdminCustomerActivityDTO[];
}

// ==========================================
// Staff DTOs
// ==========================================

export interface AdminStaffRoleBriefDTO {
  id: string;
  name: string;
  slug: string;
}

export interface AdminStaffWarehouseBriefDTO {
  id: string;
  code: string;
  name: string;
}

export interface AdminStaffListItemDTO {
  id: string;
  authProviderId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: StaffStatus;
  roles: AdminStaffRoleBriefDTO[];
  assignedWarehouseId: string | null;
  warehouse?: AdminStaffWarehouseBriefDTO | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStaffDetailDTO extends AdminStaffListItemDTO {
  effectivePermissions: Permission[];
  activity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;
}

// ==========================================
// Roles & Permissions DTOs
// ==========================================

export interface AdminRoleDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  active: boolean;
  staffCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPermissionDTO {
  code: string;
  name: string;
  module: string;
  description: string;
}

// ==========================================
// System Settings DTOs
// ==========================================

export interface AdminSystemSettingDTO {
  key: string;
  category: SystemSettingsCategory;
  value: Record<string, unknown>;
  description?: string;
  updatedBy?: string;
  updatedAt: Date;
}

// ==========================================
// Audit Log DTOs
// ==========================================

export interface AdminAuditLogDTO {
  id: string;
  actorId: string;
  actorType: AuditActorType;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
