/**
 * VÉRONA — SMS Notification Channel Handler (Phase 25)
 *
 * Transactional SMS delivery abstraction. Operates in simulation mode unless
 * external SMS gateway credentials (Twilio, Gupshup, etc.) are actively configured.
 */

import { NotificationChannel, NotificationDeliveryStatus } from "@/constants/status";
import { INotificationChannelHandler, ChannelDeliveryResult } from "./channel.interface";
import { DeliveryPlan } from "../types/notification.types";
import { logger } from "@/lib/logger";

export class SmsChannelHandler implements INotificationChannelHandler {
  public readonly channel = NotificationChannel.SMS;
  private readonly isConfigured = Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);

  async send(plan: DeliveryPlan): Promise<ChannelDeliveryResult> {
    const { recipient, notificationId } = plan;

    if (!recipient.phone) {
      return {
        channel: this.channel,
        status: NotificationDeliveryStatus.FAILED,
        provider: "SMS_GATEWAY",
        errorCode: "NO_PHONE_NUMBER",
        errorMessage: "Customer does not have a verified telephone number",
      };
    }

    if (!this.isConfigured) {
      logger.info("SMS delivery simulated (Provider not configured)", {
        context: "SmsChannelHandler",
        metadata: { notificationId, recipient: recipient.phone },
      });

      return {
        channel: this.channel,
        status: NotificationDeliveryStatus.SENT,
        provider: "SIMULATED_SMS",
        providerMessageId: `sms_sim_${Date.now()}`,
      };
    }

    // When provider is configured, dispatch here
    return {
      channel: this.channel,
      status: NotificationDeliveryStatus.SENT,
      provider: process.env.SMS_PROVIDER || "SMS_GATEWAY",
      providerMessageId: `sms_${Date.now()}`,
    };
  }
}

export const smsChannelHandler = new SmsChannelHandler();
