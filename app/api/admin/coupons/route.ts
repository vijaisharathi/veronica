/**
 * VÉRONA — Admin Coupons API Route
 *
 * GET  /api/admin/coupons — List coupons with pagination and filtering
 * POST /api/admin/coupons — Create a new coupon
 *
 * Guarded by Phase 5 RBAC: COUPONS_READ, COUPONS_CREATE
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { couponService } from "@/modules/pricing/coupon.service";
import { validateRequestBody } from "@/lib/validation";
import { CreateCouponInputSchema } from "@/modules/pricing/pricing.validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.COUPONS_READ);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await couponService.listCoupons({
      page,
      limit,
      status,
      search,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requirePermission(PERMISSIONS.COUPONS_CREATE);
    const body = await validateRequestBody(request, CreateCouponInputSchema);

    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const coupon = await couponService.createCoupon(body, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress,
    });

    return apiSuccess(coupon, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
