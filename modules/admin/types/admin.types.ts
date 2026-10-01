/**
 * VÉRONA — Admin & Operations Dashboard Types and DTOs (Phase 27)
 *
 * Defines strongly-typed DTOs for the centralized operational dashboard,
 * permission-gated KPI metrics, operational alerts, cross-domain search results,
 * and safe payment management projections.
 */

import { Permission } from "@/constants/permissions";

export type DateRangeOption = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

export type AdminAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface AdminKpiDTO {
  key: string;
  label: string;
  value: number | string;
  formattedValue: string;
  comparisonLabel?: string;
  trend?: "UP" | "DOWN" | "NEUTRAL";
  trendPercentage?: number;
  status?: "NORMAL" | "WARNING" | "CRITICAL";
  href?: string;
  permission: Permission;
}

export interface AdminAlertDTO {
  id: string;
  type: string;
  severity: AdminAlertSeverity;
  title: string;
  description: string;
  resourceType: string;
  resourceId?: string;
  href: string;
  createdAt: string;
  count?: number;
}

export interface AdminOrdersSummaryDTO {
  ordersToday: number;
  ordersPending: number;
  ordersConfirmed: number;
  ordersProcessing: number;
  ordersShipped: number;
  ordersDelivered: number;
  ordersCancelled: number;
  recentOrders: Array<{
    orderNumber: string;
    customerName: string;
    totalAmountFormatted: string;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminFulfillmentSummaryDTO {
  pendingFulfillment: number;
  inTransit: number;
  outForDelivery: number;
  deliveredToday: number;
  rtoExceptions: number;
  failedShipments: number;
}

export interface AdminInventorySummaryDTO {
  totalVariants: number;
  inStockVariants: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  totalUnitsOnHand: number;
  totalUnitsReserved: number;
  totalUnitsAvailable: number;
  criticalShortages: Array<{
    sku: string;
    productName: string;
    available: number;
    reorderThreshold: number;
  }>;
}

export interface AdminWarehousesSummaryDTO {
  totalWarehouses: number;
  activeWarehouses: number;
  warehouseList: Array<{
    id: string;
    name: string;
    code: string;
    city: string;
    active: boolean;
    stockCount: number;
    lowStockCount: number;
  }>;
}

export interface AdminPaymentsSummaryDTO {
  revenueTodayMinor: number;
  revenueTodayFormatted: string;
  capturedCount: number;
  pendingCount: number;
  failedCount: number;
  reconciliationRequiredCount: number;
  recentPayments: Array<{
    paymentId: string;
    orderReference?: string;
    amountFormatted: string;
    status: string;
    provider: string;
    createdAt: string;
  }>;
}

export interface AdminRefundsSummaryDTO {
  pendingRefunds: number;
  processingRefunds: number;
  completedRefunds: number;
  failedRefunds: number;
  totalRefundedMinor: number;
  totalRefundedFormatted: string;
}

export interface AdminReturnsSummaryDTO {
  pendingReturns: number;
  awaitingInspection: number;
  pendingExchanges: number;
  completedReturns: number;
}

export interface AdminReviewsSummaryDTO {
  pendingModeration: number;
  reportedReviews: number;
  publishedReviews: number;
  averageRating: number;
}

export interface AdminNotificationsSummaryDTO {
  deliveredCount: number;
  failedCount: number;
  retryPendingCount: number;
  failureRate: number;
}

export interface AdminSupportSummaryDTO {
  openTickets: number;
  urgentTickets: number;
  unassignedTickets: number;
  slaAtRisk: number;
  slaBreached: number;
}

export interface AdminCatalogSummaryDTO {
  draftProducts: number;
  publishedProducts: number;
  archivedProducts: number;
  totalProducts: number;
  recentlyUpdated: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    updatedAt: string;
  }>;
}

export interface AdminMarketingSummaryDTO {
  activeCampaigns: number;
  scheduledCampaigns: number;
  pausedCampaigns: number;
  activeBanners: number;
  expiringCampaigns: Array<{
    id: string;
    name: string;
    endAt: string;
  }>;
}

export interface AdminCustomersDashboardSummaryDTO {
  totalCustomers: number;
  newCustomersInPeriod: number;
  activeCustomers: number;
  suspendedCustomers: number;
}

export interface AdminWorkforceDashboardSummaryDTO {
  totalStaff: number;
  activeStaff: number;
  suspendedStaff: number;
  totalRoles: number;
}

export interface AdminDashboardDTO {
  range: DateRangeOption;
  dateBounds: {
    start: string;
    end: string;
  };
  freshnessTimestamp: string;
  staff: {
    id: string;
    email: string;
    name: string;
    role: string;
    assignedWarehouseId?: string;
  };
  kpis: AdminKpiDTO[];
  alerts: AdminAlertDTO[];
  orders?: AdminOrdersSummaryDTO;
  fulfillment?: AdminFulfillmentSummaryDTO;
  inventory?: AdminInventorySummaryDTO;
  warehouses?: AdminWarehousesSummaryDTO;
  payments?: AdminPaymentsSummaryDTO;
  refunds?: AdminRefundsSummaryDTO;
  returns?: AdminReturnsSummaryDTO;
  reviews?: AdminReviewsSummaryDTO;
  notifications?: AdminNotificationsSummaryDTO;
  support?: AdminSupportSummaryDTO;
  catalog?: AdminCatalogSummaryDTO;
  marketing?: AdminMarketingSummaryDTO;
  customers?: AdminCustomersDashboardSummaryDTO;
  workforce?: AdminWorkforceDashboardSummaryDTO;
  partialFailures?: Array<{
    widget: string;
    error: string;
  }>;
}

export interface AdminSearchResultDTO {
  type: "ORDER" | "PRODUCT" | "CUSTOMER" | "PAYMENT" | "REFUND" | "RETURN" | "TICKET" | "REVIEW";
  reference: string;
  title: string;
  subtitle: string;
  status?: string;
  href: string;
  updatedAt?: string;
}

export interface AdminPaymentDetailDTO {
  id: string;
  checkoutSessionId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amountMinor: number;
  amountFormatted: string;
  currency: string;
  status: string;
  method?: string;
  attempts: Array<{
    attemptId: string;
    providerOrderId: string;
    providerPaymentId?: string;
    amountFormatted: string;
    status: string;
    failureCode?: string;
    failureMessage?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
