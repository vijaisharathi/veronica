/**
 * VÉRONA — Notification Delivery Service (Phase 25)
 *
 * Coordinates execution of multi-channel delivery plans, tracks individual
 * delivery attempts in NotificationDeliveryAttemptModel, handles exponential backoff
 * retries, and enforces delivery idempotency.
 */

import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationStatus,
  NotificationPriority,
} from "@/constants/status";
import {
  DeliveryPlan,
  DeliveryAttemptDTO,
} from "../types/notification.types";
import {
  NotificationModel,
  NotificationDeliveryAttemptModel,
} from "@/db/models";
import { inAppChannelHandler } from "../channels/in-app.channel";
import { emailChannelHandler } from "../channels/email.channel";
import { smsChannelHandler } from "../channels/sms.channel";
import { pushChannelHandler } from "../channels/push.channel";
import { INotificationChannelHandler, ChannelDeliveryResult } from "../channels/channel.interface";
import { logger } from "@/lib/logger";

export interface DeliveryExecutionSummary {
  notificationId: string;
  totalChannels: number;
  successfulChannels: NotificationChannel[];
  failedChannels: NotificationChannel[];
  results: ChannelDeliveryResult[];
}

export class NotificationDeliveryService {
  private readonly channelHandlers: Map<NotificationChannel, INotificationChannelHandler> = new Map();
  private readonly maxAttempts = 3;

  constructor() {
    this.channelHandlers.set(NotificationChannel.IN_APP, inAppChannelHandler);
    this.channelHandlers.set(NotificationChannel.EMAIL, emailChannelHandler);
    this.channelHandlers.set(NotificationChannel.SMS, smsChannelHandler);
    this.channelHandlers.set(NotificationChannel.PUSH, pushChannelHandler);
  }

  /**
   * Executes the full delivery plan across all eligible channels.
   * Guaranteed never to throw uncaught exceptions (strict failure isolation).
   */
  async executeDeliveryPlan(plan: DeliveryPlan): Promise<DeliveryExecutionSummary> {
    const summary: DeliveryExecutionSummary = {
      notificationId: plan.notificationId,
      totalChannels: plan.channels.length,
      successfulChannels: [],
      failedChannels: [],
      results: [],
    };

    for (const channel of plan.channels) {
      try {
        const result = await this.deliverToChannel(plan, channel, 1);
        summary.results.push(result);

        if (
          result.status === NotificationDeliveryStatus.SENT ||
          result.status === NotificationDeliveryStatus.DELIVERED
        ) {
          summary.successfulChannels.push(channel);
        } else {
          summary.failedChannels.push(channel);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error("Channel delivery execution failed unexpectedly", {
          context: "NotificationDeliveryService",
          error: errorMsg,
          metadata: { notificationId: plan.notificationId, channel },
        });

        summary.failedChannels.push(channel);
        summary.results.push({
          channel,
          status: NotificationDeliveryStatus.FAILED,
          provider: "SYSTEM",
          errorCode: "DELIVERY_EXECUTION_EXCEPTION",
          errorMessage: errorMsg,
        });
      }
    }

    return summary;
  }

  /**
   * Dispatches delivery to an individual channel, records the attempt,
   * and handles initial attempt state.
   */
  async deliverToChannel(
    plan: DeliveryPlan,
    channel: NotificationChannel,
    attemptNumber: number
  ): Promise<ChannelDeliveryResult> {
    const handler = this.channelHandlers.get(channel);

    if (!handler) {
      return {
        channel,
        status: NotificationDeliveryStatus.FAILED,
        provider: "NONE",
        errorCode: "UNSUPPORTED_CHANNEL",
        errorMessage: `No handler registered for channel: ${channel}`,
      };
    }

    const idempotencyKey = `attempt_${plan.notificationId}_${channel}_${attemptNumber}`;
    const recipientIdentifier =
      channel === NotificationChannel.EMAIL
        ? plan.recipient.email
        : channel === NotificationChannel.SMS
        ? plan.recipient.phone || "unknown_phone"
        : plan.recipient.customerId;

    // Create attempt record in PENDING state
    let attemptDoc;
    try {
      attemptDoc = await NotificationDeliveryAttemptModel.create({
        notificationId: plan.notificationId,
        eventId: plan.eventId,
        customerId: plan.recipient.customerId,
        channel,
        provider: "PENDING",
        recipient: recipientIdentifier,
        attemptNumber,
        status: NotificationDeliveryStatus.PENDING,
        idempotencyKey,
        attemptedAt: new Date(),
      });
    } catch (err: unknown) {
      // Check if attempt already exists (idempotency safety)
      const existing = await NotificationDeliveryAttemptModel.findOne({ idempotencyKey }).lean();
      if (existing) {
        logger.warn("Delivery attempt already processed (Idempotent bypass)", {
          context: "NotificationDeliveryService",
          metadata: { idempotencyKey, status: existing.status },
        });
        return {
          channel,
          status: existing.status as NotificationDeliveryStatus,
          provider: existing.provider,
          providerMessageId: existing.providerMessageId,
        };
      }
      throw err;
    }

    // Execute actual channel handler
    const result = await handler.send(plan);

    // Calculate retry timestamp if failed and attempts remain
    let nextRetryAt: Date | undefined;
    let finalStatus = result.status;

    if (
      result.status === NotificationDeliveryStatus.FAILED &&
      attemptNumber < this.maxAttempts &&
      channel !== NotificationChannel.IN_APP
    ) {
      finalStatus = NotificationDeliveryStatus.RETRY_PENDING;
      // Exponential backoff: attempt 1 -> 60s, attempt 2 -> 180s
      const delaySeconds = Math.pow(2, attemptNumber) * 30;
      nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
    }

    // Update attempt document with provider result
    await NotificationDeliveryAttemptModel.findByIdAndUpdate(attemptDoc._id, {
      $set: {
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        status: finalStatus,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        completedAt: new Date(),
        nextRetryAt: nextRetryAt || null,
      },
    });

    logger.info("Notification channel delivery recorded", {
      context: "NotificationDeliveryService",
      metadata: {
        notificationId: plan.notificationId,
        channel,
        provider: result.provider,
        status: finalStatus,
        attemptNumber,
      },
    });

    return result;
  }

  /**
   * Retries a previously failed channel delivery attempt.
   * Enforces retry bounds and idempotency.
   */
  async retryDeliveryAttempt(
    attemptId: string,
    authorizedActor: { id: string; email?: string }
  ): Promise<{ success: boolean; result?: ChannelDeliveryResult; error?: string }> {
    const attempt = await NotificationDeliveryAttemptModel.findById(attemptId);
    if (!attempt) {
      return { success: false, error: "Delivery attempt record not found" };
    }

    if (
      attempt.status === NotificationDeliveryStatus.SENT ||
      attempt.status === NotificationDeliveryStatus.DELIVERED
    ) {
      return { success: false, error: "Cannot retry an already successful delivery attempt" };
    }

    if (attempt.attemptNumber >= this.maxAttempts) {
      return {
        success: false,
        error: `Maximum retry attempts (${this.maxAttempts}) reached for this notification channel`,
      };
    }

    const notification = await NotificationModel.findById(attempt.notificationId);
    if (!notification) {
      return { success: false, error: "Associated notification document does not exist" };
    }

    // Reconstruct delivery plan for this single channel retry
    const nextAttemptNumber = attempt.attemptNumber + 1;
    const plan: DeliveryPlan = {
      notificationId: notification._id.toString(),
      eventId: notification.eventId || `retry_${Date.now()}`,
      recipient: {
        customerId: notification.customerId.toString(),
        email: attempt.recipient.includes("@") ? attempt.recipient : "",
        phone: !attempt.recipient.includes("@") ? attempt.recipient : undefined,
        name: "Valued Client",
        displayName: "Valued Client",
      },
      priority: (notification.priority as NotificationPriority) || NotificationPriority.NORMAL,
      channels: [attempt.channel as NotificationChannel],
      templateKey: notification.eventType || "generic",
      templateData: {
        ...(notification.data || {}),
        orderNumber: notification.data?.orderNumber,
        refundNumber: notification.data?.refundNumber,
        returnNumber: notification.data?.returnNumber,
      },
      actionUrl: notification.actionUrl,
    };

    logger.info("Manual delivery retry triggered by staff", {
      context: "NotificationDeliveryService",
      metadata: {
        attemptId,
        notificationId: notification._id.toString(),
        actor: authorizedActor.email || authorizedActor.id,
        nextAttemptNumber,
      },
    });

    const result = await this.deliverToChannel(plan, attempt.channel as NotificationChannel, nextAttemptNumber);

    return { success: result.status === NotificationDeliveryStatus.SENT || result.status === NotificationDeliveryStatus.DELIVERED, result };
  }

  /**
   * Fetches delivery attempts for a given notification.
   */
  async getAttemptsByNotificationId(notificationId: string): Promise<DeliveryAttemptDTO[]> {
    const attempts = await NotificationDeliveryAttemptModel.find({ notificationId })
      .sort({ attemptNumber: 1, createdAt: 1 })
      .lean();

    return attempts.map((a) => ({
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
    }));
  }
}

export const notificationDeliveryService = new NotificationDeliveryService();
