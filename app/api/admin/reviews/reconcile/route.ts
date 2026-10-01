/**
 * VÉRONA — Admin Review Aggregate Reconciliation API Route
 *
 * POST /api/admin/reviews/reconcile
 * Recalculates product rating aggregates deterministically from all published reviews.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";
import { reviewAggregationService } from "@/modules/reviews";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function POST(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.REVIEWS_MODERATE,
      PERMISSIONS.REVIEWS_MANAGE,
    ]);

    const body = await request.json().catch(() => ({}));
    if (!body.productId) {
      throw new ValidationError("productId is required for aggregate reconciliation");
    }

    const summary = await reviewAggregationService.reconcileProductAggregates(body.productId);

    return apiSuccess(summary, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
