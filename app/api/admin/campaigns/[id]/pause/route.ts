/**
 * VÉRONA — Admin Campaign Pause API Route (Phase 28)
 *
 * POST /api/admin/campaigns/:id/pause — Pauses an active campaign.
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
    const staff = await requirePermission(PERMISSIONS.CAMPAIGNS_PAUSE);
    const { id } = await params;

    const paused = await campaignManagementService.pauseCampaign(id, staff);
    return apiSuccess(paused);
  } catch (error) {
    return apiError(error);
  }
}
