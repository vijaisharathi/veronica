/**
 * VÉRONA — Email Notification Channel Handler (Phase 25)
 *
 * Coordinates template rendering, provider transmission (Resend),
 * and audit event persistence.
 */

import { NotificationChannel, NotificationDeliveryStatus, EmailEventStatus } from "@/constants/status";
import { INotificationChannelHandler, ChannelDeliveryResult } from "./channel.interface";
import { DeliveryPlan } from "../types/notification.types";
import { templateRegistry } from "../templates/template-registry";
import { resendEmailProvider } from "../providers/resend-email.provider";
import { EmailEventModel } from "@/db/models";
import { logger } from "@/lib/logger";

export class EmailChannelHandler implements INotificationChannelHandler {
  public readonly channel = NotificationChannel.EMAIL;

  async send(plan: DeliveryPlan): Promise<ChannelDeliveryResult> {
    const { recipient, templateKey, templateData, notificationId, eventId } = plan;

    if (!recipient.email || !recipient.email.includes("@")) {
      return {
        channel: this.channel,
        status: NotificationDeliveryStatus.FAILED,
        provider: resendEmailProvider.providerName,
        errorCode: "INVALID_EMAIL_RECIPIENT",
        errorMessage: `Recipient email '${recipient.email}' is invalid`,
      };
    }

    try {
      // 1. Render template
      const enrichedData = {
        ...templateData,
        customerName: recipient.name || recipient.displayName || "Esteemed Client",
        customerEmail: recipient.email,
        actionUrl: plan.actionUrl,
      };

      const rendered = templateRegistry.renderTemplate(templateKey, enrichedData);

      // 2. Dispatch via Resend Provider
      const idempotencyKey = `email_${notificationId}_${templateKey}`;
      const result = await resendEmailProvider.sendEmail({
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey,
        metadata: {
          notificationId,
          eventId,
          templateKey,
          version: rendered.version,
        },
      });

      // 3. Persist EmailEvent audit record
      await EmailEventModel.create({
        notificationId,
        eventId,
        customerId: recipient.customerId,
        recipientEmail: recipient.email,
        template: `${templateKey}:${rendered.version}`,
        provider: resendEmailProvider.providerName,
        providerMessageId: result.providerMessageId,
        status: result.status,
        sentAt: result.success ? new Date() : undefined,
        failedAt: !result.success ? new Date() : undefined,
        error: result.error,
        idempotencyKey,
      }).catch((err) => {
        logger.warn("Failed to record EmailEvent document", {
          context: "EmailChannelHandler",
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return {
        channel: this.channel,
        status: result.success
          ? NotificationDeliveryStatus.SENT
          : NotificationDeliveryStatus.FAILED,
        provider: resendEmailProvider.providerName,
        providerMessageId: result.providerMessageId,
        errorMessage: result.error,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected email rendering or delivery failure";
      logger.error("Email channel dispatch error", {
        context: "EmailChannelHandler",
        error: errorMessage,
        metadata: { notificationId, recipient: recipient.email },
      });

      return {
        channel: this.channel,
        status: NotificationDeliveryStatus.FAILED,
        provider: resendEmailProvider.providerName,
        errorCode: "EMAIL_DISPATCH_EXCEPTION",
        errorMessage,
      };
    }
  }
}

export const emailChannelHandler = new EmailChannelHandler();
