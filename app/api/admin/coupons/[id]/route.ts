/**
 * VÉRONA — Admin Coupon Details & Mutations API Route
 *
 * GET    /api/admin/coupons/:id — Fetch coupon by ID
 * PATCH  /api/admin/coupons/:id — Update coupon
 * DELETE /api/admin/coupons/:id — Soft-delete coupon
 *
 * Guarded by Phase 5 RBAC: COUPONS_READ, COUPONS_UPDATE, COUPONS_DELETE
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { couponService } from "@/modules/pricing/coupon.service";
import { validateRequestBody } from "@/lib/validation";
import { UpdateCouponInputSchema } from "@/modules/pricing/pricing.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(PERMISSIONS.COUPONS_READ);
    const { id } = await params;

    const coupon = await couponService.getCouponById(id);
    return apiSuccess(coupon);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.COUPONS_UPDATE);
    const { id } = await params;
    const body = await validateRequestBody(request, UpdateCouponInputSchema);

    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const coupon = await couponService.updateCoupon(id, body, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress,
    });

    return apiSuccess(coupon);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.COUPONS_DELETE);
    const { id } = await params;

    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const result = await couponService.deleteCoupon(id, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
