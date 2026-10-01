/**
 * VÉRONA — Admin Campaign Activation API Route (Phase 28)
 *
 * POST /api/admin/campaigns/:id/activate — Activate a campaign after validating
 * scheduling window and referenced targets (categories, products, collections).
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { campaignManagementService } from "@/modules/campaigns/campaign-management.service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await requirePermission(PERMISSIONS.CAMPAIGNS_ACTIVATE);
    const { id } = await params;

    const activated = await campaignManagementService.activateCampaign(id, staff);
    return apiSuccess(activated);
  } catch (error) {
    return apiError(error);
  }
}
