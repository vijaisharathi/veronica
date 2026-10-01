/**
 * VÉRONA — Review Abuse Reporting API Route
 *
 * POST /api/account/reviews/[id]/report
 * Authenticated customer flags an inappropriate or fraudulent review.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError, TooManyRequestsError } from "@/lib/errors";
import { reviewReportService } from "@/modules/reviews";
import { CreateReportSchema } from "@/modules/reviews/validators/review.validators";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const customer = await requireCustomer();
    const customerId = customer._id.toString();
    const { id } = await context.params;

    // Rate limiting: max 10 reports per hour per customer to prevent griefing
    const rateCheck = checkRateLimit(`review_report_${customerId}`, 10, 60 * 60 * 1000);
    if (!rateCheck.success) {
      throw new TooManyRequestsError("Too many reports submitted. Please try again later.");
    }

    const body = await request.json().catch(() => ({}));
    const parsed = CreateReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid report payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await reviewReportService.submitReport(id, customerId, parsed.data);

    return apiSuccess(
      {
        ...result,
        message: "Thank you. Your report has been submitted to our moderation team.",
      },
      { status: 201, headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
