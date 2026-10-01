/**
 * VÉRONA — Platform Settings & Secret Protection Unit Tests (Phase 29)
 *
 * Verifies strict secret key exclusion, typed category schemas,
 * and configuration validation constraints.
 */

import { describe, it, expect } from "vitest";
import { SystemSettingsCategory } from "@/constants/status";
import {
  isSecretSettingKey,
  AdminSettingUpdateSchema,
  StoreSettingsSchema,
  MaintenanceSettingsSchema,
  FeatureFlagsSettingsSchema,
} from "@/modules/admin/validators/admin-platform-settings.validation";

describe("Phase 29 — Platform Settings & Secrets Boundary", () => {
  it("strictly detects and flags cryptographic keys, credentials, and API secrets", () => {
    expect(isSecretSettingKey("razorpay_key_secret")).toBe(true);
    expect(isSecretSettingKey("clerk_secret_key")).toBe(true);
    expect(isSecretSettingKey("resend_api_key")).toBe(true);
    expect(isSecretSettingKey("db_password")).toBe(true);
    expect(isSecretSettingKey("jwt_access_token")).toBe(true);
    expect(isSecretSettingKey("oauth_client_secret")).toBe(true);
    expect(isSecretSettingKey("aws_private_key")).toBe(true);
  });

  it("permits standard, non-sensitive platform setting keys", () => {
    expect(isSecretSettingKey("store.info")).toBe(false);
    expect(isSecretSettingKey("platform.maintenance")).toBe(false);
    expect(isSecretSettingKey("platform.feature_flags")).toBe(false);
    expect(isSecretSettingKey("shipping.domestic_policy")).toBe(false);
  });

  it("rejects setting updates containing secret key names via schema refine", () => {
    const invalid = AdminSettingUpdateSchema.safeParse({
      key: "payment.razorpay_secret_key",
      category: SystemSettingsCategory.PAYMENT,
      value: { secret: "sec_test_123" },
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.errors[0]?.message).toContain("Secrets and credentials cannot be stored");
    }
  });

  it("validates store identity & localization schema", () => {
    const valid = StoreSettingsSchema.safeParse({
      storeName: "VÉRONA",
      legalEntityName: "VÉRONA Luxury Retail Pvt. Ltd.",
      supportEmail: "concierge@verona.com",
      supportPhone: "+91 800 837 6621",
      defaultCurrency: "INR",
      defaultLocale: "en-IN",
      defaultTimezone: "Asia/Kolkata",
      storeAddress: {
        line1: "104 Heritage Boulevard",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560038",
        country: "India",
      },
    });
    expect(valid.success).toBe(true);
  });

  it("validates maintenance mode schema", () => {
    const valid = MaintenanceSettingsSchema.safeParse({
      enabled: true,
      message: "Scheduled platform upgrade in progress",
      allowedIps: ["127.0.0.1", "10.0.0.1"],
    });
    expect(valid.success).toBe(true);
  });

  it("validates feature flags schema", () => {
    const valid = FeatureFlagsSettingsSchema.safeParse({
      enableReviews: true,
      enableWishlist: true,
      enableCouponDiscounts: true,
      enableInternationalShipping: false,
      enableReturnPickupScheduling: true,
    });
    expect(valid.success).toBe(true);
  });
});
