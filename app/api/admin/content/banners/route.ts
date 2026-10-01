/**
 * VÉRONA — Admin Banners API Route (Phase 28)
 *
 * GET  /api/admin/content/banners — List all promotional and marketing banners
 * POST /api/admin/content/banners — Create a new banner with scheduling window
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { contentManagementService } from "@/modules/content/content-management.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminBannerCreateSchema } from "@/modules/content/content.validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.BANNERS_READ);

    const { searchParams } = new URL(request.url);
    const placement = searchParams.get("placement") || undefined;

    const banners = await contentManagementService.listBanners(placement);

    return apiSuccess({ banners });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.BANNERS_CREATE);

    const body = await validateRequestBody(request, AdminBannerCreateSchema);
    const created = await contentManagementService.createBanner(body, staff);

    return apiSuccess(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
