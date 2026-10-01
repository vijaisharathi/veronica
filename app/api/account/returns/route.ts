import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { returnService } from "@/modules/returns";
import { CreateReturnRequestSchema } from "@/modules/returns/validators/return.validators";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, ValidationError } from "@/lib/errors";
import { ReturnStatus, ReturnType } from "@/constants/status";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

/**
 * GET /api/account/returns
 * List all returns belonging to the authenticated customer.
 */
export async function GET(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = (searchParams.get("status") as ReturnStatus) || undefined;
    const type = (searchParams.get("type") as ReturnType) || undefined;

    const result = await returnService.findReturnsAdmin({
      customerId,
      status,
      type,
      page,
      limit,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}

/**
 * POST /api/account/returns
 * Create a new return request for delivered order items.
 */
export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer();
    const customerId = customer._id.toString();

    const body = await request.json().catch(() => ({}));
    const parsed = CreateReturnRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message || "Invalid return request payload",
        parsed.error.flatten().fieldErrors
      );
    }

    const created = await returnService.createReturnRequest(parsed.data, customerId);

    return apiSuccess(created, { status: 201, headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
