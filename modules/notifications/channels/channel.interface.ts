/**
 * VÉRONA — Notification Channel Interface (Phase 25)
 *
 * Contract implemented by every delivery channel (IN_APP, EMAIL, SMS, PUSH).
 */

import { NotificationChannel, NotificationDeliveryStatus } from "@/constants/status";
import { DeliveryPlan } from "../types/notification.types";

export interface ChannelDeliveryResult {
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface INotificationChannelHandler {
  readonly channel: NotificationChannel;
  send(plan: DeliveryPlan): Promise<ChannelDeliveryResult>;
}
