import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { returnRepository, exchangeService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAnyPermission([
      PERMISSIONS.EXCHANGES_READ,
      PERMISSIONS.EXCHANGES_MANAGE,
    ]);

    const { id } = await context.params;
    const exchange = await returnRepository.findExchangeById(id);
    if (!exchange) {
      throw new NotFoundError("ExchangeRequest", id);
    }

    const adminDto = exchangeService.mapToAdminDto(exchange);

    return apiSuccess(adminDto, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
