/**
 * VÉRONA — Admin Platform Settings Service (Phase 29)
 *
 * Provides strongly-typed configuration administration, category scoping,
 * default seeding, and strict secret protection.
 */

import { SystemSettingsModel } from "@/db/models";
import { SystemSettingsCategory } from "@/constants/status";
import { ISystemSettings, IStaff } from "@/types/database";
import { NotFoundError, BadRequestError, SecurityError } from "@/lib/errors";
import { logAuditTrail } from "@/lib/audit";
import {
  AdminSettingUpdateInput,
  StoreSettingsSchema,
  MaintenanceSettingsSchema,
  FeatureFlagsSettingsSchema,
  isSecretSettingKey,
} from "../validators/admin-platform-settings.validation";
import { AdminSystemSettingDTO } from "../types/admin-management.types";

export class AdminPlatformSettingsService {
  /**
   * Retrieves all platform settings, optionally filtered by category.
   * Strictly filters out any blacklisted secret keys.
   */
  async getSettings(category?: SystemSettingsCategory): Promise<AdminSystemSettingDTO[]> {
    const filter: Record<string, unknown> = {};
    if (category) {
      filter.category = category;
    }

    const settings = await SystemSettingsModel.find(filter).sort({ category: 1, key: 1 }).lean<ISystemSettings[]>();

    return settings
      .filter((s) => !isSecretSettingKey(s.key))
      .map((s) => ({
        key: s.key,
        category: s.category,
        value: (s.value as Record<string, unknown>) || {},
        description: s.description,
        updatedBy: s.updatedBy,
        updatedAt: new Date(s.updatedAt),
      }));
  }

  /**
   * Retrieves single setting by its unique configuration key.
   */
  async getSettingByKey(key: string): Promise<AdminSystemSettingDTO> {
    if (isSecretSettingKey(key)) {
      throw new SecurityError("Access denied: Inspection of secret keys is prohibited");
    }

    const setting = await SystemSettingsModel.findOne({ key }).lean<ISystemSettings>();
    if (!setting) {
      throw new NotFoundError(`Platform setting '${key}' not found`);
    }

    return {
      key: setting.key,
      category: setting.category,
      value: (setting.value as Record<string, unknown>) || {},
      description: setting.description,
      updatedBy: setting.updatedBy,
      updatedAt: new Date(setting.updatedAt),
    };
  }

  /**
   * Updates or upserts a platform setting with type validation and audit logging.
   */
  async updateSetting(
    input: AdminSettingUpdateInput,
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminSystemSettingDTO> {
    if (isSecretSettingKey(input.key)) {
      throw new SecurityError(
        "Security violation: Secret credentials (API keys, passwords, tokens) cannot be stored in platform settings"
      );
    }

    // Specific category payload validations
    let validatedValue = input.value;
    if (input.key === "store.info" || input.category === SystemSettingsCategory.STORE) {
      const parsed = StoreSettingsSchema.safeParse(input.value);
      if (parsed.success) {
        validatedValue = parsed.data;
      }
    } else if (input.key === "platform.maintenance" || input.category === SystemSettingsCategory.MAINTENANCE) {
      const parsed = MaintenanceSettingsSchema.safeParse(input.value);
      if (parsed.success) {
        validatedValue = parsed.data;
      }
    } else if (input.key === "platform.feature_flags" || input.category === SystemSettingsCategory.FEATURE_FLAGS) {
      const parsed = FeatureFlagsSettingsSchema.safeParse(input.value);
      if (parsed.success) {
        validatedValue = parsed.data;
      }
    }

    const existing = await SystemSettingsModel.findOne({ key: input.key }).lean<ISystemSettings>();
    const beforeValue = existing?.value || null;

    const updated = await SystemSettingsModel.findOneAndUpdate(
      { key: input.key },
      {
        $set: {
          category: input.category,
          value: validatedValue,
          description: input.description,
          updatedBy: actorStaff.email,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<ISystemSettings>();

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action: "platform.setting_changed",
      entityType: "SystemSettings",
      entityId: input.key,
      before: beforeValue ? { value: beforeValue } : undefined,
      after: { value: validatedValue },
      metadata: { category: input.category },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return {
      key: updated.key,
      category: updated.category,
      value: (updated.value as Record<string, unknown>) || {},
      description: updated.description,
      updatedBy: updated.updatedBy,
      updatedAt: new Date(updated.updatedAt),
    };
  }

  /**
   * Seeds default platform configuration if not already initialized.
   */
  async seedDefaultSettings(): Promise<void> {
    const defaults = [
      {
        key: "store.info",
        category: SystemSettingsCategory.STORE,
        value: {
          storeName: "VÉRONA",
          legalEntityName: "VÉRONA Luxury Retail Pvt. Ltd.",
          supportEmail: "concierge@verona.com",
          supportPhone: "+91 800 837 6621",
          defaultCurrency: "INR",
          defaultLocale: "en-IN",
          defaultTimezone: "Asia/Kolkata",
          storeAddress: {
            line1: "104 Heritage Boulevard, Indiranagar",
            line2: "100 Feet Road",
            city: "Bengaluru",
            state: "Karnataka",
            postalCode: "560038",
            country: "India",
          },
        },
        description: "Official store identity, localized address, and contact channels",
      },
      {
        key: "platform.maintenance",
        category: SystemSettingsCategory.MAINTENANCE,
        value: {
          enabled: false,
          message: "VÉRONA is briefly undergoing scheduled maintenance. Please visit shortly.",
          allowedIps: [],
        },
        description: "Platform-wide maintenance mode banner and access controls",
      },
      {
        key: "platform.feature_flags",
        category: SystemSettingsCategory.FEATURE_FLAGS,
        value: {
          enableReviews: true,
          enableWishlist: true,
          enableCouponDiscounts: true,
          enableInternationalShipping: false,
          enableReturnPickupScheduling: true,
        },
        description: "Operational feature toggles across customer touchpoints",
      },
    ];

    for (const d of defaults) {
      await SystemSettingsModel.updateOne(
        { key: d.key },
        { $setOnInsert: { category: d.category, value: d.value, description: d.description } },
        { upsert: true }
      );
    }
  }
}

export const adminPlatformSettingsService = new AdminPlatformSettingsService();
