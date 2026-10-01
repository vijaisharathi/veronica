/**
 * VÉRONA — Admin Review Reject API Route
 *
 * POST /api/admin/reviews/[id]/reject
 * Moderation staff rejects review with policy reason.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { reviewModerationService } from "@/modules/reviews";
import { ReviewModerationReason } from "@/constants/status";
import { IStaff } from "@/types/database";

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
      PERMISSIONS.REVIEWS_REJECT,
      PERMISSIONS.REVIEWS_MODERATE,
      PERMISSIONS.REVIEWS_MANAGE,
    ]);

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const reason = body.reason || ReviewModerationReason.POLICY_VIOLATION;

    const updated = await reviewModerationService.rejectReview(
      id,
      staff as unknown as IStaff,
      reason,
      body.notes
    );

    return apiSuccess(
      { reviewId: updated._id.toString(), status: updated.status, reason },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
