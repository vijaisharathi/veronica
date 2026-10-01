/**
 * VÉRONA — Admin Single Editorial Story API Route (Phase 28)
 *
 * PATCH  /api/admin/content/editorial/:id — Update story content, publishing status, or SEO
 * DELETE /api/admin/content/editorial/:id — Archive story
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { contentManagementService } from "@/modules/content/content-management.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminEditorialStoryUpdateSchema } from "@/modules/content/content.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.CONTENT_UPDATE);
    const { id } = await params;

    const body = await validateRequestBody(request, AdminEditorialStoryUpdateSchema);
    const updated = await contentManagementService.updateEditorialStory(id, body, staff);

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.CONTENT_ARCHIVE);
    const { id } = await params;

    const result = await contentManagementService.archiveEditorialStory(id, staff);
    return apiSuccess({ success: result });
  } catch (error) {
    return apiError(error);
  }
}
