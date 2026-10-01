/**
 * VÉRONA — Web Push Notification Channel Handler (Phase 25)
 *
 * Web Push / Mobile push delivery abstraction.
 */

import { NotificationChannel, NotificationDeliveryStatus } from "@/constants/status";
import { INotificationChannelHandler, ChannelDeliveryResult } from "./channel.interface";
import { DeliveryPlan } from "../types/notification.types";
import { logger } from "@/lib/logger";

export class PushChannelHandler implements INotificationChannelHandler {
  public readonly channel = NotificationChannel.PUSH;

  async send(plan: DeliveryPlan): Promise<ChannelDeliveryResult> {
    const { recipient, notificationId } = plan;

    logger.info("Web push notification registered", {
      context: "PushChannelHandler",
      metadata: { notificationId, customerId: recipient.customerId },
    });

    return {
      channel: this.channel,
      status: NotificationDeliveryStatus.SENT,
      provider: "WEB_PUSH",
      providerMessageId: `push_${Date.now()}`,
    };
  }
}

export const pushChannelHandler = new PushChannelHandler();
