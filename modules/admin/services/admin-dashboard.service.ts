/**
 * VÉRONA — Admin & Operations Dashboard Orchestration Service (Phase 27)
 *
 * Authoritative, server-side orchestration layer that aggregates real operational metrics,
 * enforces strict RBAC and warehouse scoping, isolates non-critical widget failures,
 * and compiles permission-gated KPI metrics.
 */

import { connectToDatabase } from "@/db/client";
import {
  OrderModel,
  PaymentModel,
  RefundModel,
  ReturnRequestModel,
  ShipmentModel,
  SupportTicketModel,
  NotificationDeliveryAttemptModel,
  ReviewModel,
  ProductVariantModel,
  WarehouseModel,
  InventoryItemModel,
  ProductModel,
  CampaignModel,
  BannerModel,
  CustomerModel,
  StaffModel,
  RoleModel,
} from "@/db/models";
import {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ShipmentStatus,
  SupportTicketStatus,
  SupportPriority,
  ReviewStatus,
  NotificationDeliveryStatus,
  ProductStatus,
  CampaignStatus,
  CustomerStatus,
  StaffStatus,
} from "@/constants/status";
import { Permission, PERMISSIONS } from "@/constants/permissions";
import { IStaff } from "@/types/database";
import { formatMoney } from "@/lib/money";
import {
  AdminDashboardDTO,
  AdminKpiDTO,
  AdminAlertDTO,
  DateRangeOption,
  AdminOrdersSummaryDTO,
  AdminFulfillmentSummaryDTO,
  AdminInventorySummaryDTO,
  AdminWarehousesSummaryDTO,
  AdminPaymentsSummaryDTO,
  AdminRefundsSummaryDTO,
  AdminReturnsSummaryDTO,
  AdminReviewsSummaryDTO,
  AdminNotificationsSummaryDTO,
  AdminSupportSummaryDTO,
  AdminCatalogSummaryDTO,
  AdminMarketingSummaryDTO,
  AdminCustomersDashboardSummaryDTO,
  AdminWorkforceDashboardSummaryDTO,
} from "../types/admin.types";
import { getDateRangeBounds } from "../utils/date.utils";
import { adminAlertService } from "./admin-alert.service";

export class AdminDashboardService {
  /**
   * Compiles the comprehensive, permission-filtered Admin Dashboard DTO.
   */
  async getDashboard(
    staff: IStaff,
    permissions: Permission[],
    range: DateRangeOption = "TODAY"
  ): Promise<AdminDashboardDTO> {
    await connectToDatabase();

    const now = new Date();
    const { start, end, previousStart, previousEnd } = getDateRangeBounds(range, now);
    const assignedWarehouseId = staff.assignedWarehouseId?.toString();

    const partialFailures: Array<{ widget: string; error: string }> = [];

    // Parallel fetchers for authorized domains
    const kpiPromises: Promise<AdminKpiDTO[]>[] = [];

    // 1. Orders KPIs & Widget
    let ordersSummary: AdminOrdersSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.ORDERS_READ) || permissions.includes(PERMISSIONS.ORDERS_READ_LIMITED)) {
      kpiPromises.push(this.computeOrderKPIs(start, end, previousStart, previousEnd));
    }

    // 2. Payments KPIs & Widget
    let paymentsSummary: AdminPaymentsSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.PAYMENTS_READ)) {
      kpiPromises.push(this.computePaymentKPIs(start, end, previousStart, previousEnd));
    }

    // 3. Inventory KPIs & Widget
    let inventorySummary: AdminInventorySummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.INVENTORY_READ)) {
      kpiPromises.push(this.computeInventoryKPIs(assignedWarehouseId));
    }

    // 4. Refunds KPIs & Widget
    let refundsSummary: AdminRefundsSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.REFUNDS_READ)) {
      kpiPromises.push(this.computeRefundKPIs(start, end));
    }

    // 5. Returns KPIs & Widget
    let returnsSummary: AdminReturnsSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.RETURNS_READ) || permissions.includes(PERMISSIONS.RETURNS_READ_LIMITED)) {
      kpiPromises.push(this.computeReturnKPIs(start, end));
    }

    // 6. Support KPIs & Widget
    let supportSummary: AdminSupportSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.SUPPORT_READ)) {
      kpiPromises.push(this.computeSupportKPIs(now));
    }

    // 7. Reviews KPIs & Widget
    let reviewsSummary: AdminReviewsSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.REVIEWS_READ)) {
      kpiPromises.push(this.computeReviewKPIs());
    }

    // 8. Notifications KPIs & Widget
    let notificationsSummary: AdminNotificationsSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.NOTIFICATIONS_READ)) {
      kpiPromises.push(this.computeNotificationKPIs(start, end));
    }

    // 9. Catalog KPIs
    if (permissions.includes(PERMISSIONS.PRODUCTS_READ)) {
      kpiPromises.push(this.computeCatalogKPIs());
    }

    // 10. Marketing KPIs
    if (permissions.includes(PERMISSIONS.CAMPAIGNS_READ) || permissions.includes(PERMISSIONS.CONTENT_READ)) {
      kpiPromises.push(this.computeMarketingKPIs(now));
    }

    // Execute KPI evaluations
    const kpiResults = await Promise.allSettled(kpiPromises);
    const flattenedKpis: AdminKpiDTO[] = [];
    for (const res of kpiResults) {
      if (res.status === "fulfilled") {
        flattenedKpis.push(...res.value);
      }
    }

    // Execute Domain Summaries in parallel with partial failure isolation
    const summaryTasks: Promise<void>[] = [];

    // Orders Summary
    if (permissions.includes(PERMISSIONS.ORDERS_READ) || permissions.includes(PERMISSIONS.ORDERS_READ_LIMITED)) {
      summaryTasks.push(
        (async () => {
          try {
            ordersSummary = await this.fetchOrdersSummary(start, end);
          } catch (err: unknown) {
            partialFailures.push({ widget: "orders", error: err instanceof Error ? err.message : "Failed to load orders" });
          }
        })()
      );
    }

    // Fulfillment Summary
    let fulfillmentSummary: AdminFulfillmentSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.FULFILLMENT_READ) || permissions.includes(PERMISSIONS.SHIPMENTS_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            fulfillmentSummary = await this.fetchFulfillmentSummary(start, end);
          } catch (err: unknown) {
            partialFailures.push({ widget: "fulfillment", error: err instanceof Error ? err.message : "Failed to load fulfillment" });
          }
        })()
      );
    }

    // Inventory Summary
    if (permissions.includes(PERMISSIONS.INVENTORY_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            inventorySummary = await this.fetchInventorySummary(assignedWarehouseId);
          } catch (err: unknown) {
            partialFailures.push({ widget: "inventory", error: err instanceof Error ? err.message : "Failed to load inventory" });
          }
        })()
      );
    }

    // Warehouses Summary
    let warehousesSummary: AdminWarehousesSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.WAREHOUSES_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            warehousesSummary = await this.fetchWarehousesSummary(assignedWarehouseId);
          } catch (err: unknown) {
            partialFailures.push({ widget: "warehouses", error: err instanceof Error ? err.message : "Failed to load warehouses" });
          }
        })()
      );
    }

    // Payments Summary
    if (permissions.includes(PERMISSIONS.PAYMENTS_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            paymentsSummary = await this.fetchPaymentsSummary(start, end);
          } catch (err: unknown) {
            partialFailures.push({ widget: "payments", error: err instanceof Error ? err.message : "Failed to load payments" });
          }
        })()
      );
    }

    // Refunds Summary
    if (permissions.includes(PERMISSIONS.REFUNDS_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            refundsSummary = await this.fetchRefundsSummary(start, end);
          } catch (err: unknown) {
            partialFailures.push({ widget: "refunds", error: err instanceof Error ? err.message : "Failed to load refunds" });
          }
        })()
      );
    }

    // Returns Summary
    if (permissions.includes(PERMISSIONS.RETURNS_READ) || permissions.includes(PERMISSIONS.RETURNS_READ_LIMITED)) {
      summaryTasks.push(
        (async () => {
          try {
            returnsSummary = await this.fetchReturnsSummary();
          } catch (err: unknown) {
            partialFailures.push({ widget: "returns", error: err instanceof Error ? err.message : "Failed to load returns" });
          }
        })()
      );
    }

    // Reviews Summary
    if (permissions.includes(PERMISSIONS.REVIEWS_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            reviewsSummary = await this.fetchReviewsSummary();
          } catch (err: unknown) {
            partialFailures.push({ widget: "reviews", error: err instanceof Error ? err.message : "Failed to load reviews" });
          }
        })()
      );
    }

    // Notifications Summary
    if (permissions.includes(PERMISSIONS.NOTIFICATIONS_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            notificationsSummary = await this.fetchNotificationsSummary(start, end);
          } catch (err: unknown) {
            partialFailures.push({ widget: "notifications", error: err instanceof Error ? err.message : "Failed to load notifications" });
          }
        })()
      );
    }

    // Support Summary
    if (permissions.includes(PERMISSIONS.SUPPORT_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            supportSummary = await this.fetchSupportSummary(now);
          } catch (err: unknown) {
            partialFailures.push({ widget: "support", error: err instanceof Error ? err.message : "Failed to load support" });
          }
        })()
      );
    }

    // Catalog Summary
    let catalogSummary: AdminCatalogSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.PRODUCTS_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            catalogSummary = await this.fetchCatalogSummary();
          } catch (err: unknown) {
            partialFailures.push({ widget: "catalog", error: err instanceof Error ? err.message : "Failed to load catalog summary" });
          }
        })()
      );
    }

    // Marketing Summary
    let marketingSummary: AdminMarketingSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.CAMPAIGNS_READ) || permissions.includes(PERMISSIONS.CONTENT_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            marketingSummary = await this.fetchMarketingSummary(now);
          } catch (err: unknown) {
            partialFailures.push({ widget: "marketing", error: err instanceof Error ? err.message : "Failed to load marketing summary" });
          }
        })()
      );
    }

    // Customer Operations Summary (Phase 29)
    let customersSummary: AdminCustomersDashboardSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.CUSTOMERS_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            const [totalCustomers, newCustomersInPeriod, activeCustomers, suspendedCustomers] = await Promise.all([
              CustomerModel.countDocuments({ isDeleted: false }),
              CustomerModel.countDocuments({ isDeleted: false, createdAt: { $gte: start, $lte: end } }),
              CustomerModel.countDocuments({ isDeleted: false, status: CustomerStatus.ACTIVE }),
              CustomerModel.countDocuments({ isDeleted: false, status: CustomerStatus.SUSPENDED }),
            ]);
            customersSummary = {
              totalCustomers,
              newCustomersInPeriod,
              activeCustomers,
              suspendedCustomers,
            };
          } catch (err: unknown) {
            partialFailures.push({ widget: "customers", error: err instanceof Error ? err.message : "Failed to load customers" });
          }
        })()
      );
    }

    // Workforce Operations Summary (Phase 29)
    let workforceSummary: AdminWorkforceDashboardSummaryDTO | undefined;
    if (permissions.includes(PERMISSIONS.STAFF_READ)) {
      summaryTasks.push(
        (async () => {
          try {
            const [totalStaff, activeStaff, suspendedStaff, totalRoles] = await Promise.all([
              StaffModel.countDocuments({ isDeleted: false }),
              StaffModel.countDocuments({ isDeleted: false, status: StaffStatus.ACTIVE }),
              StaffModel.countDocuments({ isDeleted: false, status: StaffStatus.SUSPENDED }),
              RoleModel.countDocuments({ active: true }),
            ]);
            workforceSummary = {
              totalStaff,
              activeStaff,
              suspendedStaff,
              totalRoles,
            };
          } catch (err: unknown) {
            partialFailures.push({ widget: "workforce", error: err instanceof Error ? err.message : "Failed to load workforce" });
          }
        })()
      );
    }

    // Operational Alerts
    let alerts: AdminAlertDTO[] = [];
    try {
      alerts = await adminAlertService.evaluateAlerts(permissions, assignedWarehouseId);
    } catch (err: unknown) {
      partialFailures.push({ widget: "alerts", error: err instanceof Error ? err.message : "Failed to evaluate alerts" });
    }

    await Promise.all(summaryTasks);

    const staffName = `${staff.firstName || ""} ${staff.lastName || ""}`.trim() || staff.email;

    return {
      range,
      dateBounds: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      freshnessTimestamp: now.toISOString(),
      staff: {
        id: staff._id.toString(),
        email: staff.email,
        name: staffName,
        role: (staff as any).roles?.[0]?.name || "Staff Member",
        assignedWarehouseId,
      },
      kpis: flattenedKpis,
      alerts,
      orders: ordersSummary,
      fulfillment: fulfillmentSummary,
      inventory: inventorySummary,
      warehouses: warehousesSummary,
      payments: paymentsSummary,
      refunds: refundsSummary,
      returns: returnsSummary,
      reviews: reviewsSummary,
      notifications: notificationsSummary,
      support: supportSummary,
      catalog: catalogSummary,
      marketing: marketingSummary,
      customers: customersSummary,
      workforce: workforceSummary,
      partialFailures: partialFailures.length > 0 ? partialFailures : undefined,
    };
  }

  // -------------------------------------------------------------
  // KPI CALCULATORS
  // -------------------------------------------------------------

  private async computeOrderKPIs(
    start: Date,
    end: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<AdminKpiDTO[]> {
    const [currentOrders, prevOrders, pendingOrders] = await Promise.all([
      OrderModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      OrderModel.countDocuments({ createdAt: { $gte: previousStart, $lte: previousEnd } }),
      OrderModel.countDocuments({ status: { $in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING] } }),
    ]);

    let trend: "UP" | "DOWN" | "NEUTRAL" = "NEUTRAL";
    let trendPercentage: number | undefined;

    if (prevOrders > 0) {
      const diff = currentOrders - prevOrders;
      trendPercentage = Math.round(Math.abs(diff / prevOrders) * 100);
      if (diff > 0) trend = "UP";
      else if (diff < 0) trend = "DOWN";
    }

    return [
      {
        key: "orders_volume",
        label: "Orders In Window",
        value: currentOrders,
        formattedValue: currentOrders.toLocaleString(),
        trend,
        trendPercentage,
        comparisonLabel: "vs previous period",
        href: "/admin/orders",
        permission: PERMISSIONS.ORDERS_READ,
      },
      {
        key: "orders_pending",
        label: "Active Orders",
        value: pendingOrders,
        formattedValue: pendingOrders.toLocaleString(),
        status: pendingOrders > 20 ? "WARNING" : "NORMAL",
        href: "/admin/orders?status=PROCESSING",
        permission: PERMISSIONS.ORDERS_READ,
      },
    ];
  }

  private async computePaymentKPIs(
    start: Date,
    end: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<AdminKpiDTO[]> {
    const [currentAgg, prevAgg, pendingPayments] = await Promise.all([
      PaymentModel.aggregate([
        { $match: { status: PaymentStatus.CAPTURED, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalMinor: { $sum: "$amount" } } },
      ]),
      PaymentModel.aggregate([
        { $match: { status: PaymentStatus.CAPTURED, createdAt: { $gte: previousStart, $lte: previousEnd } } },
        { $group: { _id: null, totalMinor: { $sum: "$amount" } } },
      ]),
      PaymentModel.countDocuments({ status: { $in: [PaymentStatus.PENDING, PaymentStatus.UNKNOWN] } }),
    ]);

    const currentTotalMinor = currentAgg[0]?.totalMinor || 0;
    const prevTotalMinor = prevAgg[0]?.totalMinor || 0;

    let trend: "UP" | "DOWN" | "NEUTRAL" = "NEUTRAL";
    let trendPercentage: number | undefined;

    if (prevTotalMinor > 0) {
      const diff = currentTotalMinor - prevTotalMinor;
      trendPercentage = Math.round(Math.abs(diff / prevTotalMinor) * 100);
      if (diff > 0) trend = "UP";
      else if (diff < 0) trend = "DOWN";
    }

    return [
      {
        key: "revenue_collected",
        label: "Net Collected Revenue",
        value: currentTotalMinor,
        formattedValue: formatMoney(currentTotalMinor),
        trend,
        trendPercentage,
        comparisonLabel: "vs previous period",
        href: "/admin/payments?status=CAPTURED",
        permission: PERMISSIONS.PAYMENTS_READ,
      },
      {
        key: "payments_pending",
        label: "Unconfirmed Payments",
        value: pendingPayments,
        formattedValue: pendingPayments.toLocaleString(),
        status: pendingPayments > 5 ? "WARNING" : "NORMAL",
        href: "/admin/payments?status=PENDING",
        permission: PERMISSIONS.PAYMENTS_READ,
      },
    ];
  }

  private async computeInventoryKPIs(assignedWarehouseId?: string): Promise<AdminKpiDTO[]> {
    const baseQuery: Record<string, unknown> = { isActive: true };
    if (assignedWarehouseId) {
      baseQuery["inventory.warehouseId"] = assignedWarehouseId;
    }

    const [outOfStock, lowStock] = await Promise.all([
      ProductVariantModel.countDocuments({
        ...baseQuery,
        "inventory.availableStock": { $lte: 0 },
      }),
      ProductVariantModel.countDocuments({
        ...baseQuery,
        $expr: {
          $and: [
            { $gt: ["$inventory.availableStock", 0] },
            { $lte: ["$inventory.availableStock", "$inventory.reorderThreshold"] },
          ],
        },
      }),
    ]);

    return [
      {
        key: "inventory_out_of_stock",
        label: "Out of Stock Variants",
        value: outOfStock,
        formattedValue: outOfStock.toLocaleString(),
        status: outOfStock > 0 ? "CRITICAL" : "NORMAL",
        href: "/admin/inventory?filter=out-of-stock",
        permission: PERMISSIONS.INVENTORY_READ,
      },
      {
        key: "inventory_low_stock",
        label: "Low Stock Alert",
        value: lowStock,
        formattedValue: lowStock.toLocaleString(),
        status: lowStock > 10 ? "WARNING" : "NORMAL",
        href: "/admin/inventory?filter=low-stock",
        permission: PERMISSIONS.INVENTORY_READ,
      },
    ];
  }

  private async computeRefundKPIs(start: Date, end: Date): Promise<AdminKpiDTO[]> {
    const pendingRefunds = await RefundModel.countDocuments({
      status: { $in: [RefundStatus.REQUESTED, RefundStatus.INITIATED, RefundStatus.PROCESSING] },
    });

    return [
      {
        key: "refunds_pending",
        label: "Pending Refunds",
        value: pendingRefunds,
        formattedValue: pendingRefunds.toLocaleString(),
        status: pendingRefunds > 5 ? "WARNING" : "NORMAL",
        href: "/admin/refunds?status=PROCESSING",
        permission: PERMISSIONS.REFUNDS_READ,
      },
    ];
  }

  private async computeReturnKPIs(start: Date, end: Date): Promise<AdminKpiDTO[]> {
    const pendingReturns = await ReturnRequestModel.countDocuments({
      status: "RETURN_REQUESTED",
    });

    return [
      {
        key: "returns_pending",
        label: "Returns Awaiting Review",
        value: pendingReturns,
        formattedValue: pendingReturns.toLocaleString(),
        status: pendingReturns > 10 ? "WARNING" : "NORMAL",
        href: "/admin/returns?status=RETURN_REQUESTED",
        permission: PERMISSIONS.RETURNS_READ,
      },
    ];
  }

  private async computeSupportKPIs(now: Date): Promise<AdminKpiDTO[]> {
    const [openTickets, urgentTickets] = await Promise.all([
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.REOPENED] },
      }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.REOPENED] },
        priority: SupportPriority.URGENT,
      }),
    ]);

    return [
      {
        key: "support_open_tickets",
        label: "Open Support Tickets",
        value: openTickets,
        formattedValue: openTickets.toLocaleString(),
        status: openTickets > 20 ? "WARNING" : "NORMAL",
        href: "/admin/support",
        permission: PERMISSIONS.SUPPORT_READ,
      },
      {
        key: "support_urgent_tickets",
        label: "Urgent Support Tickets",
        value: urgentTickets,
        formattedValue: urgentTickets.toLocaleString(),
        status: urgentTickets > 0 ? "CRITICAL" : "NORMAL",
        href: "/admin/support?priority=URGENT",
        permission: PERMISSIONS.SUPPORT_READ,
      },
    ];
  }

  private async computeReviewKPIs(): Promise<AdminKpiDTO[]> {
    const pendingReviews = await ReviewModel.countDocuments({
      status: ReviewStatus.PENDING,
    });

    return [
      {
        key: "reviews_pending",
        label: "Reviews to Moderate",
        value: pendingReviews,
        formattedValue: pendingReviews.toLocaleString(),
        status: pendingReviews > 15 ? "WARNING" : "NORMAL",
        href: "/admin/reviews?status=PENDING",
        permission: PERMISSIONS.REVIEWS_READ,
      },
    ];
  }

  private async computeNotificationKPIs(start: Date, end: Date): Promise<AdminKpiDTO[]> {
    const failedCount = await NotificationDeliveryAttemptModel.countDocuments({
      status: NotificationDeliveryStatus.FAILED,
      createdAt: { $gte: start, $lte: end },
    });

    return [
      {
        key: "notifications_failed",
        label: "Failed Deliveries",
        value: failedCount,
        formattedValue: failedCount.toLocaleString(),
        status: failedCount > 0 ? "WARNING" : "NORMAL",
        href: "/admin/notifications",
        permission: PERMISSIONS.NOTIFICATIONS_READ,
      },
    ];
  }

  // -------------------------------------------------------------
  // DOMAIN SUMMARIES
  // -------------------------------------------------------------

  private async fetchOrdersSummary(start: Date, end: Date): Promise<AdminOrdersSummaryDTO> {
    const [
      ordersToday,
      ordersPending,
      ordersConfirmed,
      ordersProcessing,
      ordersShipped,
      ordersDelivered,
      ordersCancelled,
      recentDocs,
    ] = await Promise.all([
      OrderModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      OrderModel.countDocuments({ status: OrderStatus.PENDING }),
      OrderModel.countDocuments({ status: OrderStatus.CONFIRMED }),
      OrderModel.countDocuments({ status: OrderStatus.PROCESSING }),
      OrderModel.countDocuments({ status: OrderStatus.SHIPPED }),
      OrderModel.countDocuments({ status: OrderStatus.DELIVERED }),
      OrderModel.countDocuments({ status: OrderStatus.CANCELLED }),
      OrderModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber customer totals status createdAt")
        .lean(),
    ]);

    const recentOrders = recentDocs.map((o) => ({
      orderNumber: o.orderNumber,
      customerName: (o as any).customer?.name || "Customer",
      totalAmountFormatted: formatMoney((o as any).totals?.grandTotalMinor || 0),
      status: o.status,
      createdAt: (o as any).createdAt instanceof Date ? (o as any).createdAt.toISOString() : String((o as any).createdAt),
    }));

    return {
      ordersToday,
      ordersPending,
      ordersConfirmed,
      ordersProcessing,
      ordersShipped,
      ordersDelivered,
      ordersCancelled,
      recentOrders,
    };
  }

  private async fetchFulfillmentSummary(start: Date, end: Date): Promise<AdminFulfillmentSummaryDTO> {
    const [
      pendingFulfillment,
      inTransit,
      outForDelivery,
      deliveredToday,
      rtoExceptions,
      failedShipments,
    ] = await Promise.all([
      ShipmentModel.countDocuments({ status: { $in: [ShipmentStatus.CREATED, ShipmentStatus.LABEL_CREATED, ShipmentStatus.READY_FOR_PICKUP] } }),
      ShipmentModel.countDocuments({ status: ShipmentStatus.IN_TRANSIT }),
      ShipmentModel.countDocuments({ status: ShipmentStatus.OUT_FOR_DELIVERY }),
      ShipmentModel.countDocuments({ status: ShipmentStatus.DELIVERED, updatedAt: { $gte: start, $lte: end } }),
      ShipmentModel.countDocuments({ status: { $in: [ShipmentStatus.RTO_INITIATED, ShipmentStatus.RTO_DELIVERED] } }),
      ShipmentModel.countDocuments({ status: ShipmentStatus.FAILED }),
    ]);

    return {
      pendingFulfillment,
      inTransit,
      outForDelivery,
      deliveredToday,
      rtoExceptions,
      failedShipments,
    };
  }

  private async fetchInventorySummary(assignedWarehouseId?: string): Promise<AdminInventorySummaryDTO> {
    const baseQuery: Record<string, unknown> = { isActive: true };
    if (assignedWarehouseId) {
      baseQuery["inventory.warehouseId"] = assignedWarehouseId;
    }

    const [totalVariants, outOfStock, lowStock, inventoryAgg, criticalDocs] = await Promise.all([
      ProductVariantModel.countDocuments(baseQuery),
      ProductVariantModel.countDocuments({ ...baseQuery, "inventory.availableStock": { $lte: 0 } }),
      ProductVariantModel.countDocuments({
        ...baseQuery,
        $expr: {
          $and: [
            { $gt: ["$inventory.availableStock", 0] },
            { $lte: ["$inventory.availableStock", "$inventory.reorderThreshold"] },
          ],
        },
      }),
      InventoryItemModel.aggregate([
        ...(assignedWarehouseId ? [{ $match: { warehouseId: assignedWarehouseId } }] : []),
        {
          $group: {
            _id: null,
            onHand: { $sum: "$quantityOnHand" },
            reserved: { $sum: "$quantityReserved" },
            available: { $sum: "$availableQuantity" },
          },
        },
      ]),
      ProductVariantModel.find({ ...baseQuery, "inventory.availableStock": { $lte: 0 } })
        .limit(5)
        .select("sku title inventory")
        .lean(),
    ]);

    const aggData = inventoryAgg[0] || { onHand: 0, reserved: 0, available: 0 };
    const inStockVariants = Math.max(0, totalVariants - outOfStock);

    const criticalShortages = criticalDocs.map((v) => ({
      sku: v.sku,
      productName: (v as any).title || v.sku,
      available: (v as any).inventory?.availableStock ?? 0,
      reorderThreshold: (v as any).inventory?.reorderThreshold ?? 5,
    }));

    return {
      totalVariants,
      inStockVariants,
      lowStockVariants: lowStock,
      outOfStockVariants: outOfStock,
      totalUnitsOnHand: aggData.onHand,
      totalUnitsReserved: aggData.reserved,
      totalUnitsAvailable: aggData.available,
      criticalShortages,
    };
  }

  private async fetchWarehousesSummary(assignedWarehouseId?: string): Promise<AdminWarehousesSummaryDTO> {
    const query: Record<string, unknown> = {};
    if (assignedWarehouseId) {
      query._id = assignedWarehouseId;
    }

    const warehouses = await WarehouseModel.find(query).lean();
    const warehouseList = warehouses.map((w) => ({
      id: w._id.toString(),
      name: w.name,
      code: w.code,
      city: w.address?.city || "Unknown",
      active: w.active ?? true,
      stockCount: 0,
      lowStockCount: 0,
    }));

    return {
      totalWarehouses: warehouses.length,
      activeWarehouses: warehouses.filter((w) => w.active).length,
      warehouseList,
    };
  }

  private async fetchPaymentsSummary(start: Date, end: Date): Promise<AdminPaymentsSummaryDTO> {
    const [revenueAgg, capturedCount, pendingCount, failedCount, stuckCount, recentDocs] = await Promise.all([
      PaymentModel.aggregate([
        { $match: { status: PaymentStatus.CAPTURED, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      PaymentModel.countDocuments({ status: PaymentStatus.CAPTURED, createdAt: { $gte: start, $lte: end } }),
      PaymentModel.countDocuments({ status: PaymentStatus.PENDING }),
      PaymentModel.countDocuments({ status: PaymentStatus.FAILED, createdAt: { $gte: start, $lte: end } }),
      PaymentModel.countDocuments({ status: { $in: [PaymentStatus.PENDING, PaymentStatus.UNKNOWN] } }),
      PaymentModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("amount providerOrderId providerPaymentId status provider createdAt")
        .lean(),
    ]);

    const revenueTodayMinor = revenueAgg[0]?.total || 0;

    const recentPayments = recentDocs.map((p) => ({
      paymentId: p._id.toString(),
      orderReference: (p as any).providerOrderId,
      amountFormatted: formatMoney(p.amount || 0),
      status: p.status,
      provider: (p as any).provider || "Razorpay",
      createdAt: (p as any).createdAt instanceof Date ? (p as any).createdAt.toISOString() : String((p as any).createdAt),
    }));

    return {
      revenueTodayMinor,
      revenueTodayFormatted: formatMoney(revenueTodayMinor),
      capturedCount,
      pendingCount,
      failedCount,
      reconciliationRequiredCount: stuckCount,
      recentPayments,
    };
  }

  private async fetchRefundsSummary(start: Date, end: Date): Promise<AdminRefundsSummaryDTO> {
    const [
      pendingRefunds,
      processingRefunds,
      completedRefunds,
      failedRefunds,
      refundTotalAgg,
    ] = await Promise.all([
      RefundModel.countDocuments({ status: RefundStatus.REQUESTED }),
      RefundModel.countDocuments({ status: RefundStatus.PROCESSING }),
      RefundModel.countDocuments({ status: RefundStatus.COMPLETED, createdAt: { $gte: start, $lte: end } }),
      RefundModel.countDocuments({ status: RefundStatus.FAILED }),
      RefundModel.aggregate([
        { $match: { status: RefundStatus.COMPLETED, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalRefundedMinor = refundTotalAgg[0]?.total || 0;

    return {
      pendingRefunds,
      processingRefunds,
      completedRefunds,
      failedRefunds,
      totalRefundedMinor,
      totalRefundedFormatted: formatMoney(totalRefundedMinor),
    };
  }

  private async fetchReturnsSummary(): Promise<AdminReturnsSummaryDTO> {
    const [
      pendingReturns,
      awaitingInspection,
      pendingExchanges,
      completedReturns,
    ] = await Promise.all([
      ReturnRequestModel.countDocuments({ status: "RETURN_REQUESTED" }),
      ReturnRequestModel.countDocuments({ status: { $in: ["RECEIVED", "INSPECTION_PENDING"] } }),
      ReturnRequestModel.countDocuments({ type: "EXCHANGE", status: { $ne: "COMPLETED" } }),
      ReturnRequestModel.countDocuments({ status: "COMPLETED" }),
    ]);

    return {
      pendingReturns,
      awaitingInspection,
      pendingExchanges,
      completedReturns,
    };
  }

  private async fetchReviewsSummary(): Promise<AdminReviewsSummaryDTO> {
    const [
      pendingModeration,
      reportedReviews,
      publishedReviews,
      ratingAgg,
    ] = await Promise.all([
      ReviewModel.countDocuments({ status: ReviewStatus.PENDING }),
      ReviewModel.countDocuments({ reportCount: { $gt: 0 } }),
      ReviewModel.countDocuments({ status: ReviewStatus.PUBLISHED }),
      ReviewModel.aggregate([
        { $match: { status: ReviewStatus.PUBLISHED } },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ]),
    ]);

    const averageRating = ratingAgg[0]?.avgRating ? Math.round(ratingAgg[0].avgRating * 10) / 10 : 5.0;

    return {
      pendingModeration,
      reportedReviews,
      publishedReviews,
      averageRating,
    };
  }

  private async fetchNotificationsSummary(start: Date, end: Date): Promise<AdminNotificationsSummaryDTO> {
    const [deliveredCount, failedCount, retryPendingCount] = await Promise.all([
      NotificationDeliveryAttemptModel.countDocuments({ status: NotificationDeliveryStatus.DELIVERED, createdAt: { $gte: start, $lte: end } }),
      NotificationDeliveryAttemptModel.countDocuments({ status: NotificationDeliveryStatus.FAILED, createdAt: { $gte: start, $lte: end } }),
      NotificationDeliveryAttemptModel.countDocuments({ status: NotificationDeliveryStatus.PENDING }),
    ]);

    const total = deliveredCount + failedCount;
    const failureRate = total > 0 ? Math.round((failedCount / total) * 100) : 0;

    return {
      deliveredCount,
      failedCount,
      retryPendingCount,
      failureRate,
    };
  }

  private async fetchSupportSummary(now: Date): Promise<AdminSupportSummaryDTO> {
    const [openTickets, urgentTickets, unassignedTickets, slaAtRisk, slaBreached] = await Promise.all([
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.REOPENED] },
      }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.REOPENED] },
        priority: SupportPriority.URGENT,
      }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
        assignedTo: { $exists: false },
      }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
        resolutionDeadline: {
          $gt: now,
          $lte: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        },
      }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
        resolutionDeadline: { $lt: now },
      }),
    ]);

    return {
      openTickets,
      urgentTickets,
      unassignedTickets,
      slaAtRisk,
      slaBreached,
    };
  }

  private async computeCatalogKPIs(): Promise<AdminKpiDTO[]> {
    const [publishedCount, draftCount] = await Promise.all([
      ProductModel.countDocuments({ status: ProductStatus.PUBLISHED, isDeleted: false }),
      ProductModel.countDocuments({ status: ProductStatus.DRAFT, isDeleted: false }),
    ]);

    return [
      {
        key: "published_products",
        label: "Live Catalog Styles",
        value: publishedCount,
        formattedValue: `${publishedCount} styles`,
        comparisonLabel: `${draftCount} in draft`,
        status: publishedCount > 0 ? "NORMAL" : "WARNING",
        href: "/admin/products",
        permission: PERMISSIONS.PRODUCTS_READ,
      },
    ];
  }

  private async computeMarketingKPIs(now: Date): Promise<AdminKpiDTO[]> {
    const activeCount = await CampaignModel.countDocuments({
      status: CampaignStatus.ACTIVE,
      isDeleted: false,
      startAt: { $lte: now },
      endAt: { $gte: now },
    });

    return [
      {
        key: "active_campaigns",
        label: "Active Campaigns",
        value: activeCount,
        formattedValue: `${activeCount} live`,
        comparisonLabel: "Promotional events",
        status: activeCount > 0 ? "NORMAL" : "NEUTRAL" as any,
        href: "/admin/marketing",
        permission: PERMISSIONS.CAMPAIGNS_READ,
      },
    ];
  }

  private async fetchCatalogSummary(): Promise<AdminCatalogSummaryDTO> {
    const [draftProducts, publishedProducts, archivedProducts, totalProducts, recents] =
      await Promise.all([
        ProductModel.countDocuments({ status: ProductStatus.DRAFT, isDeleted: false }),
        ProductModel.countDocuments({ status: ProductStatus.PUBLISHED, isDeleted: false }),
        ProductModel.countDocuments({ status: ProductStatus.ARCHIVED, isDeleted: false }),
        ProductModel.countDocuments({ isDeleted: false }),
        ProductModel.find({ isDeleted: false })
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean(),
      ]);

    return {
      draftProducts,
      publishedProducts,
      archivedProducts,
      totalProducts,
      recentlyUpdated: recents.map((r: any) => ({
        id: r._id.toString(),
        title: r.title,
        slug: r.slug,
        status: r.status,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
      })),
    };
  }

  private async fetchMarketingSummary(now: Date): Promise<AdminMarketingSummaryDTO> {
    const [activeCampaigns, scheduledCampaigns, pausedCampaigns, activeBanners, expiring] =
      await Promise.all([
        CampaignModel.countDocuments({
          status: CampaignStatus.ACTIVE,
          isDeleted: false,
          startAt: { $lte: now },
          endAt: { $gte: now },
        }),
        CampaignModel.countDocuments({
          status: CampaignStatus.ACTIVE,
          isDeleted: false,
          startAt: { $gt: now },
        }),
        CampaignModel.countDocuments({
          status: CampaignStatus.PAUSED,
          isDeleted: false,
        }),
        BannerModel.countDocuments({
          active: true,
          $and: [
            { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
            { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
          ],
        }),
        CampaignModel.find({
          status: CampaignStatus.ACTIVE,
          isDeleted: false,
          endAt: { $gte: now, $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
        })
          .limit(3)
          .lean(),
      ]);

    return {
      activeCampaigns,
      scheduledCampaigns,
      pausedCampaigns,
      activeBanners,
      expiringCampaigns: expiring.map((e: any) => ({
        id: e._id.toString(),
        name: e.name,
        endAt: new Date(e.endAt).toISOString(),
      })),
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
