/**
 * VÉRONA — Admin Support Ticket Queue API Route
 *
 * GET /api/admin/support — Query tickets across all queues with filtering, search, and pagination.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { supportService } from "@/modules/support/services/support.service";
import { SupportCategory, SupportPriority, SupportSlaState, SupportTicketStatus } from "@/constants/status";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyPermission([
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_MANAGE,
    ]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const statusParam = searchParams.get("status") as SupportTicketStatus | null;
    const priorityParam = searchParams.get("priority") as SupportPriority | null;
    const categoryParam = searchParams.get("category") as SupportCategory | null;
    const slaStateParam = searchParams.get("slaState") as SupportSlaState | null;

    const status = statusParam && Object.values(SupportTicketStatus).includes(statusParam) ? statusParam : undefined;
    const priority = priorityParam && Object.values(SupportPriority).includes(priorityParam) ? priorityParam : undefined;
    const category = categoryParam && Object.values(SupportCategory).includes(categoryParam) ? categoryParam : undefined;
    const slaState = slaStateParam && Object.values(SupportSlaState).includes(slaStateParam) ? slaStateParam : undefined;

    const queue = searchParams.get("queue") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await supportService.getAdminTickets({
      page,
      limit,
      status,
      priority,
      category,
      queue,
      assignedTo,
      search,
      slaState,
    });

    return apiSuccess(result, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
