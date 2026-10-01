/**
 * VÉRONA — Admin Homepage Sections API Route (Phase 28)
 *
 * GET  /api/admin/content/sections — List all homepage sections (auto-seeded if empty)
 * POST /api/admin/content/sections — Reorder sections sequentially
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { contentManagementService } from "@/modules/content/content-management.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminHomepageSectionReorderSchema } from "@/modules/content/content.validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.CONTENT_READ);

    const sections = await contentManagementService.listSections();

    return apiSuccess({ sections });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.CONTENT_UPDATE);

    const body = await validateRequestBody(request, AdminHomepageSectionReorderSchema);
    const result = await contentManagementService.reorderSections(body.orderedIds, staff);

    return apiSuccess({ success: result });
  } catch (error) {
    return apiError(error);
  }
}
