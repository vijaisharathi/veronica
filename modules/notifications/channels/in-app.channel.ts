/**
 * VÉRONA — In-App Notification Channel Handler (Phase 25)
 *
 * Confirms receipt and immediate availability of the in-app notification record.
 */

import { NotificationChannel, NotificationDeliveryStatus } from "@/constants/status";
import { INotificationChannelHandler, ChannelDeliveryResult } from "./channel.interface";
import { DeliveryPlan } from "../types/notification.types";

export class InAppChannelHandler implements INotificationChannelHandler {
  public readonly channel = NotificationChannel.IN_APP;

  async send(plan: DeliveryPlan): Promise<ChannelDeliveryResult> {
    // In-app notifications are stored directly in MongoDB via primary Notification document
    return {
      channel: this.channel,
      status: NotificationDeliveryStatus.DELIVERED,
      provider: "INTERNAL_DATABASE",
      providerMessageId: plan.notificationId,
    };
  }
}

export const inAppChannelHandler = new InAppChannelHandler();
