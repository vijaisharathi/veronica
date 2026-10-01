/**
 * VÉRONA — Admin Campaigns & Marketing API Route (Phase 15 / Phase 28)
 *
 * GET  /api/admin/campaigns — List promotional campaigns with targeting, status & schedule
 * POST /api/admin/campaigns — Create a new campaign
 *
 * Guarded by Phase 5 / Phase 28 RBAC: CAMPAIGNS_READ / DISCOUNTS_READ, CAMPAIGNS_CREATE / DISCOUNTS_CREATE
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { campaignManagementService } from "@/modules/campaigns/campaign-management.service";
import { couponService } from "@/modules/pricing/coupon.service";
import { validateRequestBody } from "@/lib/validation";
import { AdminCampaignCreateSchema } from "@/modules/campaigns/campaign.validation";
import { CreateCampaignInputSchema } from "@/modules/pricing/pricing.validation";
import { CampaignStatus } from "@/constants/status";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([PERMISSIONS.CAMPAIGNS_READ, PERMISSIONS.DISCOUNTS_READ]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CampaignStatus | undefined;
    const search = searchParams.get("search") || undefined;
    const legacy = searchParams.get("legacy") === "true";

    if (legacy) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
      const result = await couponService.listCampaigns({
        page,
        limit,
        status,
        search,
      });
      return apiSuccess(result);
    }

    const campaigns = await campaignManagementService.listCampaigns(status, search);
    return apiSuccess({ campaigns, total: campaigns.length });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireAnyPermission([
      PERMISSIONS.CAMPAIGNS_CREATE,
      PERMISSIONS.DISCOUNTS_CREATE,
    ]);

    const rawBody = await request.clone().json();

    // If targeted fields or UTM present, use Phase 28 schema and service
    if (
      rawBody.targetCategoryIds ||
      rawBody.targetProductIds ||
      rawBody.targetCollectionIds ||
      rawBody.targetBrandIds ||
      rawBody.utm ||
      rawBody.discountConfig
    ) {
      const body = await validateRequestBody(request, AdminCampaignCreateSchema);
      const campaign = await campaignManagementService.createCampaign(body, staff);
      return apiSuccess(campaign, { status: 201 });
    }

    // Otherwise fallback to Phase 15 coupon service
    const body = await validateRequestBody(request, CreateCampaignInputSchema);
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const campaign = await couponService.createCampaign(body, {
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      ipAddress,
    });

    return apiSuccess(campaign, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
