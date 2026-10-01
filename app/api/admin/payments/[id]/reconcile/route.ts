/**
 * VÉRONA — Admin Payment Reconciliation API Route (Phase 27)
 *
 * POST /api/admin/payments/[id]/reconcile — Queries provider to reconcile payment and updates state.
 */

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { adminPaymentService } from "@/modules/admin/services/admin-payment.service";
import { AuditLogModel } from "@/db/models";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requirePermission(PERMISSIONS.PAYMENTS_RECONCILE);
    const { id } = await params;

    const reconciled = await adminPaymentService.reconcilePayment(id);

    // Record administrative reconciliation in audit log
    await AuditLogModel.create({
      actorId: staff._id.toString(),
      actorType: "STAFF",
      actorEmail: staff.email,
      action: "PAYMENT_RECONCILE",
      entityType: "PAYMENT",
      entityId: id,
      description: `Payment ${id} reconciled against provider. Current status: ${reconciled.status}`,
      metadata: {
        paymentId: id,
        status: reconciled.status,
        providerOrderId: reconciled.providerOrderId,
        providerPaymentId: reconciled.providerPaymentId,
      },
    });

    return apiSuccess(reconciled, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(error);
  }
}
