/**
 * VÉRONA — Notification Channel Router (Phase 25)
 *
 * Resolves the final delivery plan channels by combining:
 * Event Default Channels + Customer Preferences + Contact Availability + Policy Invariants.
 */

import {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from "@/constants/status";
import { RecipientInfo, NotificationPreferenceDTO } from "../types/notification.types";
import { notificationPreferenceService } from "../preferences/notification-preference.service";

export class ChannelRouterService {
  /**
   * Evaluates which channels should deliver the notification.
   */
  resolveChannels(
    defaultChannels: NotificationChannel[],
    category: NotificationCategory,
    priority: NotificationPriority,
    recipient: RecipientInfo,
    preferences: NotificationPreferenceDTO
  ): NotificationChannel[] {
    const activeChannels: NotificationChannel[] = [];

    for (const channel of defaultChannels) {
      // 1. Check if preference allows this channel for this category
      const permitted = notificationPreferenceService.isChannelAndCategoryPermitted(
        preferences,
        channel,
        category,
        priority
      );

      if (!permitted) {
        continue;
      }

      // 2. Validate contact availability
      if (channel === NotificationChannel.EMAIL && (!recipient.email || !recipient.email.includes("@"))) {
        continue;
      }

      if (channel === NotificationChannel.SMS && !recipient.phone) {
        continue;
      }

      activeChannels.push(channel);
    }

    // Always ensure at least IN_APP is retained if all external channels were suppressed or unavailable
    if (activeChannels.length === 0 && defaultChannels.includes(NotificationChannel.IN_APP)) {
      activeChannels.push(NotificationChannel.IN_APP);
    }

    return activeChannels;
  }
}

export const channelRouterService = new ChannelRouterService();
