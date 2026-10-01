import { NextRequest, NextResponse } from "next/server";
import { deliveryServiceabilityService } from "@/modules/delivery";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, AppError } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Evaluates rate limit for the client IP address.
 */
function enforceRateLimit(request: NextRequest): void {
  const clientIp = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`delivery:${clientIp}`, 60, 60 * 1000);

  if (!rateLimit.success) {
    throw new AppError(
      "Too many serviceability checks requested. Please wait a moment before trying again.",
      "RATE_LIMIT_EXCEEDED",
      429,
      true,
      { retryAfter: rateLimit.reset }
    );
  }
}

/**
 * GET /api/delivery/serviceability?postalCode=600001&country=IN
 * Public query endpoint to check delivery serviceability for a PIN code.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    enforceRateLimit(request);

    const { searchParams } = new URL(request.url);
    const postalCode = searchParams.get("postalCode") || "";
    const country = searchParams.get("country") || "IN";

    const result = await deliveryServiceabilityService.checkServiceability({
      postalCode,
      country,
    });

    return apiSuccess(result, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300",
      },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * POST /api/delivery/serviceability
 * Checks serviceability with optional cart context payload.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    enforceRateLimit(request);

    const body = await request.json().catch(() => ({}));
    const postalCode = typeof body.postalCode === "string" ? body.postalCode : "";
    const country = typeof body.country === "string" ? body.country : "IN";

    const result = await deliveryServiceabilityService.checkServiceability({
      postalCode,
      country,
      cart: body.cart,
    });

    return apiSuccess(result, {
      headers: {
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
