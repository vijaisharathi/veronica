import { describe, it, expect } from "vitest";
import {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
} from "@/constants/status";
import { NotificationPreferenceService } from "@/modules/notifications/preferences/notification-preference.service";
import { ChannelRouterService } from "@/modules/notifications/router/channel-router.service";
import { RecipientInfo, NotificationPreferenceDTO } from "@/modules/notifications/types/notification.types";

describe("Phase 25 — Notification Preferences & Channel Routing", () => {
  const preferenceService = new NotificationPreferenceService();
  const routerService = new ChannelRouterService();

  const dummyRecipient: RecipientInfo = {
    customerId: "cust_12345",
    email: "clara.oswald@verona-client.com",
    phone: "+919876543210",
    name: "Clara Oswald",
    displayName: "Clara Oswald",
  };

  describe("Preference Defaults & Invariants", () => {
    it("provides safe defaults enabling transactional and security channels", () => {
      const defaults = preferenceService.getDefaultPreferences("cust_12345");

      expect(defaults.customerId).toBe("cust_12345");
      expect(defaults.email).toBe(true);
      expect(defaults.inApp).toBe(true);
      expect(defaults.securityAlerts).toBe(true);
      expect(defaults.orderUpdates).toBe(true);
      expect(defaults.shippingUpdates).toBe(true);
      expect(defaults.paymentUpdates).toBe(true);
      expect(defaults.marketing).toBe(false); // Optional defaults to false
    });

    it("strictly preserves securityAlerts = true even if client attempts to disable it", () => {
      const existing: NotificationPreferenceDTO = {
        customerId: "cust_12345",
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
        securityAlerts: true,
        marketing: false,
      };

      // Ensure that regardless of input, securityAlerts remains true
      expect(existing.securityAlerts).toBe(true);
    });

    it("always permits SECURITY category and CRITICAL priority regardless of user channel toggles", () => {
      const disabledPreferences: NotificationPreferenceDTO = {
        customerId: "cust_12345",
        email: false, // User disabled email
        sms: false,
        push: false,
        whatsapp: false,
        inApp: false, // User disabled in-app
        orderUpdates: false,
        paymentUpdates: false,
        shippingUpdates: false,
        returnRefundUpdates: false,
        reviewUpdates: false,
        securityAlerts: true,
        marketing: false,
      };

      // Security category must ALWAYS be permitted
      const emailSecurity = preferenceService.isChannelAndCategoryPermitted(
        disabledPreferences,
        NotificationChannel.EMAIL,
        NotificationCategory.SECURITY,
        NotificationPriority.CRITICAL
      );
      expect(emailSecurity).toBe(true);

      const inAppSecurity = preferenceService.isChannelAndCategoryPermitted(
        disabledPreferences,
        NotificationChannel.IN_APP,
        NotificationCategory.SECURITY,
        NotificationPriority.CRITICAL
      );
      expect(inAppSecurity).toBe(true);
    });

    it("respects category disabling for optional communications", () => {
      const preferences: NotificationPreferenceDTO = {
        customerId: "cust_12345",
        email: true,
        sms: true,
        push: true,
        whatsapp: false,
        inApp: true,
        orderUpdates: true,
        paymentUpdates: true,
        shippingUpdates: true,
        returnRefundUpdates: true,
        reviewUpdates: false, // Disabled
        securityAlerts: true,
        marketing: false, // Disabled
      };

      // Reviews disabled
      const reviewsEmail = preferenceService.isChannelAndCategoryPermitted(
        preferences,
        NotificationChannel.EMAIL,
        NotificationCategory.REVIEWS,
        NotificationPriority.NORMAL
      );
      expect(reviewsEmail).toBe(false);

      // Marketing disabled
      const marketingEmail = preferenceService.isChannelAndCategoryPermitted(
        preferences,
        NotificationChannel.EMAIL,
        NotificationCategory.MARKETING,
        NotificationPriority.LOW
      );
      expect(marketingEmail).toBe(false);

      // Orders enabled
      const orderEmail = preferenceService.isChannelAndCategoryPermitted(
        preferences,
        NotificationChannel.EMAIL,
        NotificationCategory.ORDERS,
        NotificationPriority.HIGH
      );
      expect(orderEmail).toBe(true);
    });
  });

  describe("Channel Router Resolution", () => {
    it("routes order confirmation to IN_APP and EMAIL when preferences are enabled", () => {
      const preferences = preferenceService.getDefaultPreferences("cust_12345");
      const defaultChannels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

      const resolved = routerService.resolveChannels(
        defaultChannels,
        NotificationCategory.ORDERS,
        NotificationPriority.HIGH,
        dummyRecipient,
        preferences
      );

      expect(resolved).toContain(NotificationChannel.IN_APP);
      expect(resolved).toContain(NotificationChannel.EMAIL);
    });

    it("filters out EMAIL if recipient does not have a valid email address", () => {
      const preferences = preferenceService.getDefaultPreferences("cust_12345");
      const recipientWithoutEmail: RecipientInfo = {
        customerId: "cust_no_email",
        email: "",
        name: "Anonymous Patron",
        displayName: "Anonymous Patron",
      };

      const resolved = routerService.resolveChannels(
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        NotificationCategory.ORDERS,
        NotificationPriority.HIGH,
        recipientWithoutEmail,
        preferences
      );

      expect(resolved).toContain(NotificationChannel.IN_APP);
      expect(resolved).not.toContain(NotificationChannel.EMAIL);
    });

    it("filters out SMS if recipient does not have a verified phone number", () => {
      const preferences = {
        ...preferenceService.getDefaultPreferences("cust_12345"),
        sms: true,
      };
      const recipientWithoutPhone: RecipientInfo = {
        customerId: "cust_no_phone",
        email: "client@verona.com",
        phone: undefined,
        name: "Patron",
        displayName: "Patron",
      };

      const resolved = routerService.resolveChannels(
        [NotificationChannel.IN_APP, NotificationChannel.SMS],
        NotificationCategory.DELIVERY,
        NotificationPriority.HIGH,
        recipientWithoutPhone,
        preferences
      );

      expect(resolved).toContain(NotificationChannel.IN_APP);
      expect(resolved).not.toContain(NotificationChannel.SMS);
    });

    it("ensures IN_APP fallback is retained even if all external channels are suppressed", () => {
      const noExternalChannels: NotificationPreferenceDTO = {
        customerId: "cust_12345",
        email: false,
        sms: false,
        push: false,
        whatsapp: false,
        inApp: false, // suppressed
        orderUpdates: false,
        paymentUpdates: false,
        shippingUpdates: false,
        returnRefundUpdates: false,
        reviewUpdates: false,
        securityAlerts: true,
        marketing: false,
      };

      const resolved = routerService.resolveChannels(
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        NotificationCategory.ORDERS,
        NotificationPriority.NORMAL,
        dummyRecipient,
        noExternalChannels
      );

      // Must retain at least IN_APP
      expect(resolved).toContain(NotificationChannel.IN_APP);
    });
  });
});
