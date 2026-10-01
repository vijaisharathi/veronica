/**
 * VÉRONA — Notification Preference Resolver & Policy Enforcer (Phase 25)
 *
 * Enforces customer communication preferences across channels and categories.
 * Guarantees that transactional and security notifications can never be silently bypassed.
 */

import { NotificationPreferenceModel } from "@/db/models";
import {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from "@/constants/status";
import {
  NotificationPreferenceDTO,
  UpdateNotificationPreferenceInput,
} from "../types/notification.types";
import { INotificationPreference } from "@/types/database";
import { logger } from "@/lib/logger";

export const DEFAULT_PREFERENCES: Omit<NotificationPreferenceDTO, "customerId" | "updatedAt"> = {
  email: true,
  sms: false,
  push: true,
  whatsapp: false,
  inApp: true,
  orderUpdates: true,
  paymentUpdates: true,
  shippingUpdates: true,
  returnRefundUpdates: true,
  reviewUpdates: true,
  securityAlerts: true, // Mandatory
  marketing: false,
};

export class NotificationPreferenceService {
  /**
   * Generates default notification preference DTO for a given customer ID.
   */
  getDefaultPreferences(customerId: string): NotificationPreferenceDTO {
    return {
      customerId,
      ...DEFAULT_PREFERENCES,
    };
  }

  /**
   * Retrieves or creates default notification preferences for an authenticated customer.
   */
  async getPreferences(customerId: string): Promise<NotificationPreferenceDTO> {
    const record = await NotificationPreferenceModel.findOne({ customerId }).lean();
    if (!record) {
      return {
        customerId,
        ...DEFAULT_PREFERENCES,
      };
    }

    return this.mapToDTO(record);
  }

  /**
   * Updates customer notification preferences with anti-IDOR and mandatory policy enforcement.
   */
  async updatePreferences(
    customerId: string,
    input: UpdateNotificationPreferenceInput
  ): Promise<NotificationPreferenceDTO> {
    // Mandatory policy: Security alerts and core order transaction receipts cannot be disabled
    const safeUpdate: Partial<INotificationPreference> = {};

    if (input.email !== undefined) safeUpdate.email = input.email;
    if (input.sms !== undefined) safeUpdate.sms = input.sms;
    if (input.push !== undefined) safeUpdate.push = input.push;
    if (input.whatsapp !== undefined) safeUpdate.whatsapp = input.whatsapp;
    if (input.inApp !== undefined) safeUpdate.inApp = input.inApp;

    if (input.orderUpdates !== undefined) safeUpdate.orderUpdates = input.orderUpdates;
    if (input.paymentUpdates !== undefined) safeUpdate.paymentUpdates = input.paymentUpdates;
    if (input.shippingUpdates !== undefined) safeUpdate.shippingUpdates = input.shippingUpdates;
    if (input.returnRefundUpdates !== undefined) safeUpdate.returnRefundUpdates = input.returnRefundUpdates;
    if (input.reviewUpdates !== undefined) safeUpdate.reviewUpdates = input.reviewUpdates;
    if (input.marketing !== undefined) safeUpdate.marketing = input.marketing;

    // Security alerts are strictly immutable from client payload
    safeUpdate.securityAlerts = true;

    const updated = await NotificationPreferenceModel.findOneAndUpdate(
      { customerId },
      {
        $set: safeUpdate,
        $setOnInsert: { customerId },
      },
      { upsert: true, new: true, lean: true }
    );

    logger.info("Notification preferences updated", {
      context: "NotificationPreferenceService",
      metadata: { customerId, update: safeUpdate },
    });

    if (!updated) {
      return this.getDefaultPreferences(customerId);
    }

    return this.mapToDTO(updated);
  }

  /**
   * Evaluates whether a notification is allowed to be dispatched via a specific channel.
   *
   * Business Policy:
   * 1. CRITICAL priority & SECURITY category: Always permitted via IN_APP & EMAIL (Mandatory).
   * 2. Transactional ORDERS, PAYMENTS, DELIVERY, RETURNS_REFUNDS: Permitted via IN_APP & EMAIL unless explicitly disabled.
   * 3. MARKETING / OPTIONAL: Strictly requires explicit opt-in.
   */
  isChannelAndCategoryPermitted(
    prefs: NotificationPreferenceDTO,
    channel: NotificationChannel,
    category: NotificationCategory,
    priority: NotificationPriority
  ): boolean {
    // 1. Mandatory Security / Critical rule
    if (priority === NotificationPriority.CRITICAL || category === NotificationCategory.SECURITY) {
      if (channel === NotificationChannel.IN_APP || channel === NotificationChannel.EMAIL) {
        return true;
      }
    }

    // 2. Channel-level enablement
    if (channel === NotificationChannel.IN_APP && !prefs.inApp) return false;
    if (channel === NotificationChannel.EMAIL && !prefs.email) return false;
    if (channel === NotificationChannel.SMS && !prefs.sms) return false;
    if (channel === NotificationChannel.PUSH && !prefs.push) return false;

    // 3. Category-level enablement
    switch (category) {
      case NotificationCategory.ORDERS:
        return prefs.orderUpdates;
      case NotificationCategory.PAYMENTS:
        return prefs.paymentUpdates;
      case NotificationCategory.DELIVERY:
        return prefs.shippingUpdates;
      case NotificationCategory.RETURNS_REFUNDS:
        return prefs.returnRefundUpdates;
      case NotificationCategory.REVIEWS:
        return prefs.reviewUpdates;
      case NotificationCategory.SECURITY:
        return true;
      case NotificationCategory.MARKETING:
        return prefs.marketing;
      default:
        return true;
    }
  }

  private mapToDTO(record: Partial<INotificationPreference>): NotificationPreferenceDTO {
    return {
      customerId: record.customerId?.toString() || "",
      email: record.email ?? DEFAULT_PREFERENCES.email,
      sms: record.sms ?? DEFAULT_PREFERENCES.sms,
      push: record.push ?? DEFAULT_PREFERENCES.push,
      whatsapp: record.whatsapp ?? DEFAULT_PREFERENCES.whatsapp,
      inApp: record.inApp ?? DEFAULT_PREFERENCES.inApp,
      orderUpdates: record.orderUpdates ?? DEFAULT_PREFERENCES.orderUpdates,
      paymentUpdates: record.paymentUpdates ?? DEFAULT_PREFERENCES.paymentUpdates,
      shippingUpdates: record.shippingUpdates ?? DEFAULT_PREFERENCES.shippingUpdates,
      returnRefundUpdates: record.returnRefundUpdates ?? DEFAULT_PREFERENCES.returnRefundUpdates,
      reviewUpdates: record.reviewUpdates ?? DEFAULT_PREFERENCES.reviewUpdates,
      securityAlerts: true, // Always true
      marketing: record.marketing ?? DEFAULT_PREFERENCES.marketing,
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : undefined,
    };
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
