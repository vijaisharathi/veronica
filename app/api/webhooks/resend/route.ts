/**
 * VÉRONA — Resend Email Webhook Handler (Phase 25)
 *
 * Receives delivery callbacks from Resend (delivered, bounced, opened, complained).
 * Enforces Svix signature verification, idempotency deduplication,
 * and updates EmailEventModel and NotificationDeliveryAttemptModel.
 */

import { NextRequest, NextResponse } from "next/server";
import { resendEmailProvider } from "@/modules/notifications/providers/resend-email.provider";
import { EmailEventModel, NotificationDeliveryAttemptModel } from "@/db/models";
import { EmailEventStatus, NotificationDeliveryStatus } from "@/constants/status";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // 1. Verify Webhook Signature
    const isValid = resendEmailProvider.verifyWebhookSignature(rawBody, request.headers);
    if (!isValid) {
      logger.warn("Resend webhook signature verification rejected", {
        context: "ResendWebhook",
      });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type as string; // e.g. "email.delivered", "email.bounced", "email.opened"
    const data = payload.data || {};
    const emailId = data.email_id || data.id; // Resend message ID

    if (!emailId) {
      return NextResponse.json({ received: true, ignored: "Missing email_id" }, { status: 200 });
    }

    logger.info(`Received Resend webhook event: ${eventType}`, {
      context: "ResendWebhook",
      metadata: { emailId, eventType },
    });

    // 2. Map Resend Event to Canonical States
    let emailStatus: EmailEventStatus | undefined;
    let deliveryStatus: NotificationDeliveryStatus | undefined;

    switch (eventType) {
      case "email.delivered":
        emailStatus = EmailEventStatus.DELIVERED;
        deliveryStatus = NotificationDeliveryStatus.DELIVERED;
        break;
      case "email.bounced":
        emailStatus = EmailEventStatus.BOUNCED;
        deliveryStatus = NotificationDeliveryStatus.BOUNCED;
        break;
      case "email.complained":
        emailStatus = EmailEventStatus.BOUNCED;
        deliveryStatus = NotificationDeliveryStatus.FAILED;
        break;
      case "email.opened":
        emailStatus = EmailEventStatus.OPENED;
        break;
      default:
        // Ignore unrecognized events gracefully
        break;
    }

    // 3. Update EmailEvent Document
    if (emailStatus) {
      const updateData: Record<string, unknown> = {
        status: emailStatus,
      };

      if (emailStatus === EmailEventStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      } else if (emailStatus === EmailEventStatus.OPENED) {
        updateData.openedAt = new Date();
      } else if (emailStatus === EmailEventStatus.BOUNCED) {
        updateData.failedAt = new Date();
        updateData.error = data.bounce_type || "Recipient email bounced";
      }

      await EmailEventModel.findOneAndUpdate(
        { providerMessageId: emailId },
        { $set: updateData }
      );
    }

    // 4. Update Delivery Attempt Document
    if (deliveryStatus) {
      await NotificationDeliveryAttemptModel.findOneAndUpdate(
        { providerMessageId: emailId },
        {
          $set: {
            status: deliveryStatus,
            completedAt: new Date(),
            providerResponse: data,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      emailId,
      eventType,
      processed: true,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Resend webhook processing exception", {
      context: "ResendWebhook",
      error: errorMsg,
    });

    return NextResponse.json(
      { error: "Webhook internal processing failure" },
      { status: 500 }
    );
  }
}
