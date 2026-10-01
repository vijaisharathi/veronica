/**
 * VÉRONA — Phase 28 RBAC, Security & Audit Unit Tests
 */

import { describe, it, expect, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLE_PERMISSIONS_MAP, ROLES } from "@/constants/roles";
import { hasPermission, hasAnyPermission } from "@/lib/auth/rbac";
import { AdminProductCreateSchema } from "@/modules/catalog/admin-catalog.validation";
import { AdminCampaignCreateSchema } from "@/modules/campaigns/campaign.validation";
import { DiscountType } from "@/constants/status";

describe("Phase 28 RBAC & Strict Role Isolation", () => {
  it("grants Marketing Manager campaign, banner, and content permissions", () => {
    const marketingPerms = ROLE_PERMISSIONS_MAP[ROLES.MARKETING_MANAGER];

    expect(hasPermission(marketingPerms, PERMISSIONS.CAMPAIGNS_READ)).toBe(true);
    expect(hasPermission(marketingPerms, PERMISSIONS.CAMPAIGNS_CREATE)).toBe(true);
    expect(hasPermission(marketingPerms, PERMISSIONS.CAMPAIGNS_ACTIVATE)).toBe(true);
    expect(hasPermission(marketingPerms, PERMISSIONS.CAMPAIGNS_PAUSE)).toBe(true);
    expect(hasPermission(marketingPerms, PERMISSIONS.BANNERS_CREATE)).toBe(true);
    expect(hasPermission(marketingPerms, PERMISSIONS.CONTENT_CREATE)).toBe(true);
  });

  it("prevents Marketing Manager from publishing or deleting catalog products", () => {
    const marketingPerms = ROLE_PERMISSIONS_MAP[ROLES.MARKETING_MANAGER];

    expect(hasPermission(marketingPerms, PERMISSIONS.PRODUCTS_PUBLISH)).toBe(false);
    expect(hasPermission(marketingPerms, PERMISSIONS.PRODUCTS_DELETE)).toBe(false);
  });

  it("grants Admin full catalog, media, and marketing orchestration permissions", () => {
    const adminPerms = ROLE_PERMISSIONS_MAP[ROLES.ADMIN];

    expect(hasPermission(adminPerms, PERMISSIONS.PRODUCTS_PUBLISH)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.PRODUCTS_ARCHIVE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.VARIANTS_CREATE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.CATEGORIES_CREATE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.COLLECTIONS_CREATE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.BRANDS_CREATE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.CAMPAIGNS_ACTIVATE)).toBe(true);
  });

  it("correctly identifies any permission with hasAnyPermission", () => {
    const perms = [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.ORDERS_READ];
    expect(hasAnyPermission(perms, [PERMISSIONS.PRODUCTS_PUBLISH, PERMISSIONS.PRODUCTS_READ])).toBe(true);
    expect(hasAnyPermission(perms, [PERMISSIONS.CAMPAIGNS_READ, PERMISSIONS.CAMPAIGNS_CREATE])).toBe(false);
  });
});

describe("Phase 28 Input Validation & Security Against Mass Assignment", () => {
  it("rejects product creation without required title", () => {
    const invalid = {
      brandId: "brand-1",
      categoryIds: ["cat-1"],
      variants: [{ sku: "SKU-1", color: { name: "Black" }, size: { type: "LETTER", value: "M" }, sellingPrice: 5000 }],
    };
    const parsed = AdminProductCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects campaign with end date earlier than start date", () => {
    const invalid = {
      name: "Flash Sale",
      startAt: "2026-10-15T00:00:00Z",
      endAt: "2026-10-10T00:00:00Z", // Earlier
      discountConfig: { type: DiscountType.PERCENTAGE, value: 15 },
    };
    const parsed = AdminCampaignCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("validates valid campaign payload with UTM metadata", () => {
    const valid = {
      name: "Winter Festive Privilege",
      slug: "winter-festive-privilege",
      startAt: "2026-11-01T00:00:00Z",
      endAt: "2026-11-15T00:00:00Z",
      discountConfig: { type: DiscountType.PERCENTAGE, value: 25 },
      utm: {
        source: "instagram",
        medium: "social",
        campaign: "winter-2026",
      },
    };
    const parsed = AdminCampaignCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
