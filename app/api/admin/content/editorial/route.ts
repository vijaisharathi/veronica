/**
 * VÉRONA — Admin Editorial Stories API Route (Phase 28)
 *
 * GET  /api/admin/content/editorial — List all editorial stories with status filtering
 * POST /api/admin/content/editorial — Create a new editorial story
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { contentManagementService } from "@/modules/content/content-management.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminEditorialStoryCreateSchema } from "@/modules/content/content.validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.CONTENT_READ);

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as "DRAFT" | "PUBLISHED" | "ARCHIVED") || undefined;

    const stories = await contentManagementService.listEditorialStories(status);

    return apiSuccess({ stories });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.CONTENT_CREATE);

    const body = await validateRequestBody(request, AdminEditorialStoryCreateSchema);
    const created = await contentManagementService.createEditorialStory(body, staff);

    return apiSuccess(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
