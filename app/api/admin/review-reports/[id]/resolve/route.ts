/**
 * VÉRONA — Admin Review Report Resolution API Route
 *
 * POST /api/admin/review-reports/[id]/resolve
 * Moderation staff resolves or dismisses report, optionally hiding the review.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";
import { reviewReportService } from "@/modules/reviews";
import { ResolveReportSchema } from "@/modules/reviews/validators/review.validators";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.REVIEWS_REPORTS_MANAGE,
      PERMISSIONS.REVIEWS_MANAGE,
    ]);

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const parsed = ResolveReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid resolution payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await reviewReportService.resolveReport(
      id,
      staff._id.toString(),
      parsed.data
    );

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
