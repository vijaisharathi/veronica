/**
 * VÉRONA — Notification Repository (Phase 25)
 *
 * Direct database access layer for customer in-app notification center,
 * read state transitions, ownership-enforced queries, and admin monitoring.
 */

import {
  NotificationModel,
  NotificationDeliveryAttemptModel,
  CustomerModel,
} from "@/db/models";
import {
  NotificationStatus,
  NotificationDeliveryStatus,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from "@/constants/status";
import {
  NotificationPublicDTO,
  NotificationAdminDTO,
  NotificationSummaryDTO,
  NotificationQueryFilter,
  DeliveryAttemptDTO,
} from "../types/notification.types";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class NotificationRepository {
  /**
   * Fetches paginated in-app notifications for the authenticated customer.
   * Strictly enforces customerId isolation (anti-IDOR).
   */
  async listForCustomer(
    customerId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<PaginatedResult<NotificationPublicDTO>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      customerId,
      // Only include notifications with IN_APP channel enabled
      channels: NotificationChannel.IN_APP,
    };

    if (options.unreadOnly) {
      query.readAt = null;
    }

    const [docs, total] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
    ]);

    const items: NotificationPublicDTO[] = docs.map((doc) => ({
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      body: doc.body,
      category: (doc.category as NotificationCategory) || NotificationCategory.ORDERS,
      priority: (doc.priority as NotificationPriority) || NotificationPriority.NORMAL,
      actionUrl: doc.actionUrl,
      read: !!doc.readAt,
      readAt: doc.readAt ? doc.readAt.toISOString() : undefined,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Efficiently counts unread notifications for a customer (uses indexed { customerId, readAt }).
   */
  async getSummaryForCustomer(customerId: string): Promise<NotificationSummaryDTO> {
    const [unreadCount, totalCount] = await Promise.all([
      NotificationModel.countDocuments({
        customerId,
        channels: NotificationChannel.IN_APP,
        readAt: null,
      }),
      NotificationModel.countDocuments({
        customerId,
        channels: NotificationChannel.IN_APP,
      }),
    ]);

    return { unreadCount, totalCount };
  }

  /**
   * Marks a single notification as read, strictly verifying customer ownership.
   */
  async markAsRead(
    notificationId: string,
    customerId: string
  ): Promise<{ success: boolean; found: boolean }> {
    const updated = await NotificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        customerId, // Strict ownership check
      },
      {
        $set: {
          readAt: new Date(),
          status: NotificationStatus.READ,
        },
      },
      { new: true }
    );

    return {
      success: !!updated,
      found: !!updated,
    };
  }

  /**
   * Marks all in-app notifications as read for a given customer.
   */
  async markAllAsRead(customerId: string): Promise<{ modifiedCount: number }> {
    const result = await NotificationModel.updateMany(
      {
        customerId,
        readAt: null,
      },
      {
        $set: {
          readAt: new Date(),
          status: NotificationStatus.READ,
        },
      }
    );

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Admin query: Lists all notifications with delivery status aggregation and filters.
   */
  async listForAdmin(filter: NotificationQueryFilter): Promise<PaginatedResult<NotificationAdminDTO>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 25));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.customerId) {
      query.customerId = filter.customerId;
    }
    if (filter.type) {
      query.type = filter.type;
    }
    if (filter.category) {
      query.category = filter.category;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.channel) {
      query.channels = filter.channel;
    }
    if (filter.unreadOnly) {
      query.readAt = null;
    }

    if (filter.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: "i" } },
        { message: { $regex: filter.search, $options: "i" } },
        { eventId: { $regex: filter.search, $options: "i" } },
      ];
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filter.endDate);
      }
    }

    const [docs, total] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
    ]);

    // Batch load customer details and delivery attempts
    const customerIds = [...new Set(docs.map((d) => d.customerId.toString()))];
    const notificationIds = docs.map((d) => d._id);

    const [customers, attempts] = await Promise.all([
      CustomerModel.find({ _id: { $in: customerIds } })
        .select("email firstName lastName")
        .lean(),
      NotificationDeliveryAttemptModel.find({ notificationId: { $in: notificationIds } })
        .sort({ attemptNumber: 1 })
        .lean(),
    ]);

    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
    const attemptsMap = new Map<string, DeliveryAttemptDTO[]>();

    for (const a of attempts) {
      const nid = a.notificationId.toString();
      const list = attemptsMap.get(nid) || [];
      list.push({
        id: a._id.toString(),
        channel: a.channel as NotificationChannel,
        provider: a.provider,
        recipient: a.recipient,
        attemptNumber: a.attemptNumber,
        status: a.status as NotificationDeliveryStatus,
        providerMessageId: a.providerMessageId,
        errorCode: a.errorCode,
        errorMessage: a.errorMessage,
        attemptedAt: a.attemptedAt.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        nextRetryAt: a.nextRetryAt?.toISOString(),
      });
      attemptsMap.set(nid, list);
    }

    const items: NotificationAdminDTO[] = docs.map((doc) => {
      const c = customerMap.get(doc.customerId.toString());
      const customerName = c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : undefined;

      return {
        id: doc._id.toString(),
        customerId: doc.customerId.toString(),
        customerEmail: c?.email,
        customerName: customerName || undefined,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        body: doc.body,
        category: (doc.category as NotificationCategory) || NotificationCategory.ORDERS,
        priority: (doc.priority as NotificationPriority) || NotificationPriority.NORMAL,
        channels: doc.channels as NotificationChannel[],
        eventId: doc.eventId,
        eventType: doc.eventType,
        actionUrl: doc.actionUrl,
        status: doc.status,
        readAt: doc.readAt ? doc.readAt.toISOString() : undefined,
        createdAt: doc.createdAt.toISOString(),
        deliveryAttempts: attemptsMap.get(doc._id.toString()) || [],
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin query: Get single notification by ID with attempts and customer details.
   */
  async getByIdForAdmin(notificationId: string): Promise<NotificationAdminDTO | null> {
    const doc = await NotificationModel.findById(notificationId).lean();
    if (!doc) return null;

    const [customer, attempts] = await Promise.all([
      CustomerModel.findById(doc.customerId).select("email firstName lastName").lean(),
      NotificationDeliveryAttemptModel.find({ notificationId: doc._id })
        .sort({ attemptNumber: 1, createdAt: 1 })
        .lean(),
    ]);

    const customerName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ")
      : undefined;

    return {
      id: doc._id.toString(),
      customerId: doc.customerId.toString(),
      customerEmail: customer?.email,
      customerName,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      body: doc.body,
      category: (doc.category as NotificationCategory) || NotificationCategory.ORDERS,
      priority: (doc.priority as NotificationPriority) || NotificationPriority.NORMAL,
      channels: doc.channels as NotificationChannel[],
      eventId: doc.eventId,
      eventType: doc.eventType,
      actionUrl: doc.actionUrl,
      status: doc.status,
      readAt: doc.readAt ? doc.readAt.toISOString() : undefined,
      createdAt: doc.createdAt.toISOString(),
      deliveryAttempts: attempts.map((a) => ({
        id: a._id.toString(),
        channel: a.channel as NotificationChannel,
        provider: a.provider,
        recipient: a.recipient,
        attemptNumber: a.attemptNumber,
        status: a.status as NotificationDeliveryStatus,
        providerMessageId: a.providerMessageId,
        errorCode: a.errorCode,
        errorMessage: a.errorMessage,
        attemptedAt: a.attemptedAt.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        nextRetryAt: a.nextRetryAt?.toISOString(),
      })),
    };
  }

  /**
   * Aggregates real-time delivery statistics for admin observability.
   */
  async getDeliveryStats(): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    channelAttempts: Record<string, number>;
    statusBreakdown: Record<string, number>;
  }> {
    const [totalNotifications, unreadNotifications, statusCounts, channelCounts] = await Promise.all([
      NotificationModel.countDocuments(),
      NotificationModel.countDocuments({ readAt: null }),
      NotificationDeliveryAttemptModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      NotificationDeliveryAttemptModel.aggregate([
        { $group: { _id: "$channel", count: { $sum: 1 } } },
      ]),
    ]);

    const statusBreakdown: Record<string, number> = {};
    for (const item of statusCounts) {
      statusBreakdown[item._id] = item.count;
    }

    const channelAttempts: Record<string, number> = {};
    for (const item of channelCounts) {
      channelAttempts[item._id] = item.count;
    }

    return {
      totalNotifications,
      unreadNotifications,
      channelAttempts,
      statusBreakdown,
    };
  }
}

export const notificationRepository = new NotificationRepository();
