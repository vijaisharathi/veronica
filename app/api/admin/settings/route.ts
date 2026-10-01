/**
 * VÉRONA — Admin Platform Settings API
 *
 * GET   /api/admin/settings — Retrieve system configurations (secrets strictly excluded).
 * PATCH /api/admin/settings — Mutate platform settings with validation and audit logging.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { SystemSettingsCategory } from "@/constants/status";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { adminPlatformSettingsService } from "@/modules/admin/services/admin-platform-settings.service";
import { AdminSettingUpdateSchema } from "@/modules/admin/validators/admin-platform-settings.validation";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.SETTINGS_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const category = categoryParam && Object.values(SystemSettingsCategory).includes(categoryParam as SystemSettingsCategory)
      ? (categoryParam as SystemSettingsCategory)
      : undefined;

    const result = await adminPlatformSettingsService.getSettings(category);
    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actorStaff = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
    const body = await request.json();
    const input = AdminSettingUpdateSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await adminPlatformSettingsService.updateSetting(input, actorStaff, { ip, ua });
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
