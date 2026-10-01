/**
 * VÉRONA — Admin & Operations Alert Service (Phase 27)
 *
 * Evaluates real-time operational conditions across orders, fulfillment, inventory,
 * payments, refunds, returns, reviews, notifications, and customer support.
 * Deduplicates repeated issues and provides direct drill-down navigation.
 */

import {
  AdminAlertDTO,
  AdminAlertSeverity,
} from "../types/admin.types";
import {
  OrderModel,
  PaymentModel,
  RefundModel,
  ShipmentModel,
  SupportTicketModel,
  NotificationDeliveryAttemptModel,
  ReviewModel,
  ProductVariantModel,
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
} from "@/constants/status";
import { Permission, PERMISSIONS } from "@/constants/permissions";

export class AdminAlertService {
  /**
   * Evaluates operational conditions across domains and returns deduplicated alerts
   * filtered strictly by the staff member's granted permissions.
   */
  async evaluateAlerts(
    permissions: Permission[],
    assignedWarehouseId?: string
  ): Promise<AdminAlertDTO[]> {
    const alerts: AdminAlertDTO[] = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // 1. Support SLA Breaches & Urgent Unassigned Tickets
    if (permissions.includes(PERMISSIONS.SUPPORT_READ)) {
      try {
        const urgentOrBreached = await SupportTicketModel.countDocuments({
          status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.REOPENED] },
          $or: [
            { priority: SupportPriority.URGENT },
            { resolutionDeadline: { $lt: now } },
          ],
        });

        if (urgentOrBreached > 0) {
          alerts.push({
            id: "alert_support_urgent_sla",
            type: "SUPPORT_SLA_BREACH",
            severity: "CRITICAL",
            title: "Urgent Support Tickets / SLA Breaches",
            description: `${urgentOrBreached} high-priority or SLA-breached customer support tickets require immediate resolution.`,
            resourceType: "SUPPORT",
            href: "/admin/support?priority=URGENT",
            createdAt: now.toISOString(),
            count: urgentOrBreached,
          });
        }
      } catch {
        // Silently isolate query failure in alert evaluation
      }
    }

    // 2. Refund Failures
    if (permissions.includes(PERMISSIONS.REFUNDS_READ)) {
      try {
        const failedRefunds = await RefundModel.countDocuments({
          status: RefundStatus.FAILED,
        });

        if (failedRefunds > 0) {
          alerts.push({
            id: "alert_refunds_failed",
            type: "REFUND_FAILURE",
            severity: "CRITICAL",
            title: "Failed Refund Transactions",
            description: `${failedRefunds} customer refund attempts failed at the payment gateway and require manual retry or reconciliation.`,
            resourceType: "REFUNDS",
            href: "/admin/refunds?status=FAILED",
            createdAt: now.toISOString(),
            count: failedRefunds,
          });
        }
      } catch {
        // Isolate query failure
      }
    }

    // 3. Payment Reconciliation Required (Stuck in PENDING for > 30 minutes)
    if (permissions.includes(PERMISSIONS.PAYMENTS_READ)) {
      try {
        const stuckPayments = await PaymentModel.countDocuments({
          status: { $in: [PaymentStatus.PENDING, PaymentStatus.UNKNOWN] },
          createdAt: { $lt: thirtyMinutesAgo },
        });

        if (stuckPayments > 0) {
          alerts.push({
            id: "alert_payments_reconciliation",
            type: "PAYMENT_RECONCILIATION_REQUIRED",
            severity: "WARNING",
            title: "Payment Reconciliation Required",
            description: `${stuckPayments} payment sessions have remained unconfirmed for over 30 minutes.`,
            resourceType: "PAYMENTS",
            href: "/admin/payments?status=PENDING",
            createdAt: now.toISOString(),
            count: stuckPayments,
          });
        }
      } catch {
        // Isolate query failure
      }
    }

    // 4. Shipment Exceptions (RTO or Failed Delivery)
    if (permissions.includes(PERMISSIONS.SHIPMENTS_READ)) {
      try {
        const shipmentExceptions = await ShipmentModel.countDocuments({
          status: {
            $in: [
              ShipmentStatus.FAILED,
              ShipmentStatus.CANCELLED,
              ShipmentStatus.RTO_INITIATED,
              ShipmentStatus.RTO_DELIVERED,
            ],
          },
        });

        if (shipmentExceptions > 0) {
          alerts.push({
            id: "alert_shipments_exception",
            type: "SHIPMENT_EXCEPTION",
            severity: "WARNING",
            title: "Shipment Logistics Exceptions",
            description: `${shipmentExceptions} packages encountered courier delivery failures or return-to-origin (RTO) triggers.`,
            resourceType: "SHIPMENTS",
            href: "/admin/fulfillment",
            createdAt: now.toISOString(),
            count: shipmentExceptions,
          });
        }
      } catch {
        // Isolate query failure
      }
    }

    // 5. Fulfillment Backlog (Confirmed orders > 24 hours old not yet packed/shipped)
    if (permissions.includes(PERMISSIONS.ORDERS_READ)) {
      try {
        const orderBacklog = await OrderModel.countDocuments({
          status: OrderStatus.CONFIRMED,
          createdAt: { $lt: twentyFourHoursAgo },
        });

        if (orderBacklog > 0) {
          alerts.push({
            id: "alert_orders_fulfillment_backlog",
            type: "FULFILLMENT_BACKLOG",
            severity: "WARNING",
            title: "Order Fulfillment Backlog",
            description: `${orderBacklog} customer orders placed over 24 hours ago are still awaiting warehouse picking or packing.`,
            resourceType: "ORDERS",
            href: "/admin/orders?status=CONFIRMED",
            createdAt: now.toISOString(),
            count: orderBacklog,
          });
        }
      } catch {
        // Isolate query failure
      }
    }

    // 6. Critical Stock Shortages (Out of Stock Variants)
    if (permissions.includes(PERMISSIONS.INVENTORY_READ)) {
      try {
        const outOfStockQuery: Record<string, unknown> = {
          "inventory.availableStock": { $lte: 0 },
          isActive: true,
        };
        // If warehouse scoped, filter query
        if (assignedWarehouseId) {
          outOfStockQuery["inventory.warehouseId"] = assignedWarehouseId;
        }

        const outOfStockCount = await ProductVariantModel.countDocuments(outOfStockQuery);

        if (outOfStockCount > 0) {
          alerts.push({
            id: "alert_inventory_out_of_stock",
            type: "CRITICAL_INVENTORY_SHORTAGE",
            severity: "WARNING",
            title: "Product Variants Out of Stock",
            description: `${outOfStockCount} active garment variants have depleted available inventory.`,
            resourceType: "INVENTORY",
            href: "/admin/inventory?filter=out-of-stock",
            createdAt: now.toISOString(),
            count: outOfStockCount,
          });
        }
      } catch {
        // Isolate query failure
      }
    }

    // 7. Notification Delivery Failures
    if (permissions.includes(PERMISSIONS.NOTIFICATIONS_READ)) {
      try {
        const failedNotifications = await NotificationDeliveryAttemptModel.countDocuments({
          status: NotificationDeliveryStatus.FAILED,
          createdAt: { $gte: twentyFourHoursAgo },
        });

        if (failedNotifications > 0) {
          alerts.push({
            id: "alert_notifications_failed",
            type: "NOTIFICATION_DELIVERY_FAILURE",
            severity: "INFO",
            title: "Notification Delivery Failures",
            description: `${failedNotifications} customer communication attempts (email/SMS) encountered delivery provider errors in the last 24 hours.`,
            resourceType: "NOTIFICATIONS",
            href: "/admin/notifications",
            createdAt: now.toISOString(),
            count: failedNotifications,
          });
        }
      } catch {
        // Isolate query failure
      }
    }

    // 8. Pending Review Backlog
    if (permissions.includes(PERMISSIONS.REVIEWS_READ)) {
      try {
        const pendingReviews = await ReviewModel.countDocuments({
          status: ReviewStatus.PENDING,
          createdAt: { $lt: twentyFourHoursAgo },
        });

        if (pendingReviews > 0) {
          alerts.push({
            id: "alert_reviews_moderation_backlog",
            type: "REVIEW_MODERATION_BACKLOG",
            severity: "INFO",
            title: "Review Moderation Backlog",
            description: `${pendingReviews} submitted product reviews have been awaiting moderation for more than 24 hours.`,
            resourceType: "REVIEWS",
            href: "/admin/reviews?status=PENDING",
            createdAt: now.toISOString(),
            count: pendingReviews,
          });
        }
      } catch {
        // Isolate query failure
      }
    }

    // Sort alerts by severity order: CRITICAL first, then WARNING, then INFO
    const severityRank: Record<AdminAlertSeverity, number> = {
      CRITICAL: 1,
      WARNING: 2,
      INFO: 3,
    };

    return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  }
}

export const adminAlertService = new AdminAlertService();
