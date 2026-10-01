/**
 * VÉRONA — Admin Single Homepage Section API Route (Phase 28)
 *
 * PATCH /api/admin/content/sections/:id — Update section configuration, visibility, or title
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { contentManagementService } from "@/modules/content/content-management.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminHomepageSectionUpdateSchema } from "@/modules/content/content.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.CONTENT_UPDATE);
    const { id } = await params;

    const body = await validateRequestBody(request, AdminHomepageSectionUpdateSchema);
    const updated = await contentManagementService.updateSection(id, body, staff);

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
