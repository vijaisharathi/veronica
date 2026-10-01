/**
 * VÉRONA — Notification Orchestrator (Phase 25)
 *
 * Core engine receiving domain events, enforcing event idempotency,
 * resolving recipient contact data, loading preferences, routing channels,
 * persisting the master notification record, and coordinating delivery.
 *
 * Guaranteed strict failure isolation: business events never fail due to
 * communication or notification pipeline errors.
 */

import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationCategory,
  NotificationChannel,
} from "@/constants/status";
import {
  VeronaDomainEvent,
  EVENT_CATALOG_CONFIG,
} from "../events/event-catalog";
import {
  RecipientInfo,
  DeliveryPlan,
} from "../types/notification.types";
import {
  NotificationModel,
  CustomerModel,
} from "@/db/models";
import { notificationPreferenceService } from "../preferences/notification-preference.service";
import { channelRouterService } from "../router/channel-router.service";
import { notificationDeliveryService, DeliveryExecutionSummary } from "../delivery/notification-delivery.service";
import { logger } from "@/lib/logger";

export interface OrchestrationResult {
  success: boolean;
  notificationId?: string;
  isIdempotentReplay?: boolean;
  channelsDelivered?: NotificationChannel[];
  channelsFailed?: NotificationChannel[];
  error?: string;
}

export class NotificationOrchestrator {
  /**
   * Processes a domain event through the complete notification pipeline.
   * Catches all exceptions to ensure calling business transactions are never affected.
   */
  async processEvent(event: VeronaDomainEvent): Promise<OrchestrationResult> {
    const { eventId, eventType, customerId } = event;

    if (!eventId || !eventType || !customerId) {
      logger.warn("NotificationOrchestrator rejected malformed event", {
        context: "NotificationOrchestrator",
        metadata: { eventId, eventType, customerId },
      });
      return { success: false, error: "Invalid event: missing eventId, eventType, or customerId" };
    }

    try {
      // 1. Idempotency Check: Prevent duplicate notifications for replayed events
      const existingNotification = await NotificationModel.findOne({
        eventId,
        customerId,
      }).lean();

      if (existingNotification) {
        logger.info("Event already processed into notification (Idempotent bypass)", {
          context: "NotificationOrchestrator",
          metadata: {
            eventId,
            eventType,
            notificationId: existingNotification._id.toString(),
          },
        });
        return {
          success: true,
          notificationId: existingNotification._id.toString(),
          isIdempotentReplay: true,
          channelsDelivered: existingNotification.channels as NotificationChannel[],
        };
      }

      // 2. Lookup event mapping configuration
      const config = EVENT_CATALOG_CONFIG[eventType];
      if (!config) {
        logger.warn(`No notification mapping found for event type: ${eventType}`, {
          context: "NotificationOrchestrator",
          metadata: { eventType, eventId },
        });
        return { success: false, error: `Unhandled event type: ${eventType}` };
      }

      // 3. Resolve Recipient from database
      const recipient = await this.resolveRecipient(customerId, event);

      // 4. Load Recipient Preferences
      const preferences = await notificationPreferenceService.getPreferences(customerId);

      // 5. Channel Router: Determine eligible channels
      const activeChannels = channelRouterService.resolveChannels(
        config.defaultChannels,
        config.category,
        config.priority,
        recipient,
        preferences
      );

      // 6. Generate Notification Content & Action URL
      const title = config.generateTitle(event as unknown as Record<string, unknown>);
      const message = config.generateMessage(event as unknown as Record<string, unknown>);
      const actionUrl = config.generateActionUrl(event as unknown as Record<string, unknown>);

      // 7. Persist Primary Notification Record in MongoDB
      const notificationDoc = await NotificationModel.create({
        customerId,
        type: config.notificationType,
        title,
        message,
        body: message,
        data: event,
        eventId,
        eventType,
        channels: activeChannels,
        priority: config.priority,
        category: config.category,
        actionUrl,
        status: NotificationStatus.UNREAD,
        readAt: null,
      });

      const notificationId = notificationDoc._id.toString();

      // 8. Build Delivery Plan
      const plan: DeliveryPlan = {
        notificationId,
        eventId,
        recipient,
        priority: config.priority,
        channels: activeChannels,
        templateKey: config.templateKey,
        templateData: {
          ...(event as unknown as Record<string, unknown>),
          customerName: recipient.name,
          customerEmail: recipient.email,
        },
        actionUrl,
      };

      // 9. Coordinate Channel Deliveries
      const executionSummary: DeliveryExecutionSummary =
        await notificationDeliveryService.executeDeliveryPlan(plan);

      logger.info("Notification successfully processed and dispatched", {
        context: "NotificationOrchestrator",
        metadata: {
          notificationId,
          eventId,
          eventType,
          successfulChannels: executionSummary.successfulChannels,
          failedChannels: executionSummary.failedChannels,
        },
      });

      return {
        success: true,
        notificationId,
        isIdempotentReplay: false,
        channelsDelivered: executionSummary.successfulChannels,
        channelsFailed: executionSummary.failedChannels,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("Notification orchestration encountered critical error", {
        context: "NotificationOrchestrator",
        error: errorMsg,
        metadata: { eventId, eventType, customerId },
      });

      // Strict failure isolation: return failure object without throwing
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Authoritatively resolves recipient contact details from customer database records.
   */
  private async resolveRecipient(
    customerId: string,
    event: VeronaDomainEvent
  ): Promise<RecipientInfo> {
    const customer = await CustomerModel.findById(customerId).lean();

    let email = customer?.email || "";
    let name = "Valued Client";
    let phone = customer?.phone || undefined;

    if (customer) {
      if (customer.firstName || customer.lastName) {
        name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
      }
    }

    // Fallback to verified event contact data if customer profile is sparse
    if (!email && "recipientEmail" in event && typeof event.recipientEmail === "string") {
      email = event.recipientEmail;
    }

    return {
      customerId,
      email: email.trim().toLowerCase(),
      phone,
      name: name.trim(),
      displayName: name.trim(),
    };
  }
}

export const notificationOrchestrator = new NotificationOrchestrator();
