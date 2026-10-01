import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { exchangeService } from "@/modules/returns";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";

import { IStaff } from "@/types/database";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.EXCHANGES_MANAGE,
      PERMISSIONS.FULFILLMENT_MANAGE,
    ]);

    const { id } = await context.params;
    const updated = await exchangeService.handoffExchangeFulfillment(id, staff as unknown as IStaff);

    return apiSuccess(updated, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
