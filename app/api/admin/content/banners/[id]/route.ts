/**
 * VÉRONA — Admin Single Banner API Route (Phase 28)
 *
 * PATCH  /api/admin/content/banners/:id — Update banner content and scheduling
 * DELETE /api/admin/content/banners/:id — Delete banner
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { contentManagementService } from "@/modules/content/content-management.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminBannerUpdateSchema } from "@/modules/content/content.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.BANNERS_UPDATE);
    const { id } = await params;

    const body = await validateRequestBody(request, AdminBannerUpdateSchema);
    const updated = await contentManagementService.updateBanner(id, body, staff);

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.BANNERS_DELETE);
    const { id } = await params;

    const result = await contentManagementService.deleteBanner(id, staff);
    return apiSuccess({ success: result });
  } catch (error) {
    return apiError(error);
  }
}
