/**
 * VÉRONA — Admin Single Campaign API Route (Phase 15 / Phase 28)
 *
 * GET    /api/admin/campaigns/:id — Fetch campaign by ID (with targeting names and active state)
 * PATCH  /api/admin/campaigns/:id — Update campaign
 * DELETE /api/admin/campaigns/:id — Soft-delete / archive campaign
 *
 * Guarded by Phase 5 / Phase 28 RBAC:
 *   CAMPAIGNS_READ / DISCOUNTS_READ
 *   CAMPAIGNS_UPDATE / DISCOUNTS_UPDATE
 *   CAMPAIGNS_DELETE / DISCOUNTS_DELETE
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { campaignManagementService } from "@/modules/campaigns/campaign-management.service";
import { couponService } from "@/modules/pricing/coupon.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminCampaignUpdateSchema } from "@/modules/campaigns/campaign.validation";
import { UpdateCampaignInputSchema } from "@/modules/pricing/pricing.validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAnyPermission([PERMISSIONS.CAMPAIGNS_READ, PERMISSIONS.DISCOUNTS_READ]);
    const { id } = await params;

    const campaign = await campaignManagementService.getCampaignById(id);
    return apiSuccess(campaign);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.CAMPAIGNS_UPDATE,
      PERMISSIONS.DISCOUNTS_UPDATE,
    ]);
    const { id } = await params;
    const rawBody = await request.clone().json();

    if (
      rawBody.targetCategoryIds ||
      rawBody.targetProductIds ||
      rawBody.targetCollectionIds ||
      rawBody.targetBrandIds ||
      rawBody.utm ||
      rawBody.discountConfig
    ) {
      const body = await validateRequestBody(request, AdminCampaignUpdateSchema);
      const campaign = await campaignManagementService.updateCampaign(id, body, staff);
      return apiSuccess(campaign);
    }

    const body = await validateRequestBody(request, UpdateCampaignInputSchema);
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const campaign = await couponService.updateCampaign(id, body, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress,
    });

    return apiSuccess(campaign);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.CAMPAIGNS_DELETE,
      PERMISSIONS.CAMPAIGNS_ARCHIVE,
      PERMISSIONS.DISCOUNTS_DELETE,
    ]);
    const { id } = await params;

    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const result = await couponService.deleteCampaign(id, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
