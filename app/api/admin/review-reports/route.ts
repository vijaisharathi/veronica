/**
 * VÉRONA — Admin Review Reports Queue API Route
 *
 * GET /api/admin/review-reports — Lists flagged abuse reports.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { reviewReportService } from "@/modules/reviews";
import { ReviewReportStatus } from "@/constants/status";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.REVIEWS_REPORTS_READ,
      PERMISSIONS.REVIEWS_REPORTS_MANAGE,
      PERMISSIONS.REVIEWS_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as ReviewReportStatus) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await reviewReportService.findReportsAdmin({
      status,
      page,
      limit,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
