/**
 * VÉRONA — Pricing & Coupon Audit Service
 *
 * Persists sensitive administrative mutations (creation, updates, activation, deletion)
 * to the authoritative AuditLog collection with actor and before/after metadata.
 */

import { AuditLogModel } from "@/db/models";
import { AuditActorType } from "@/constants/status";
import { connectToDatabase } from "@/db/client";
import { logger } from "@/lib/logger";

export interface RecordPricingAuditInput {
  actorId: string;
  action: string;
  entityType: "COUPON" | "CAMPAIGN";
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordPricingAudit(input: RecordPricingAuditInput): Promise<void> {
  try {
    await connectToDatabase();
    await AuditLogModel.create({
      actorId: input.actorId,
      actorType: AuditActorType.STAFF,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before || null,
      after: input.after || null,
      metadata: input.metadata || {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    logger.info(`Pricing audit recorded: ${input.action}`, {
      context: "PricingAudit",
      metadata: { entityType: input.entityType, entityId: input.entityId, actorId: input.actorId },
    });
  } catch (err) {
    // Non-blocking log failure but recorded
    logger.error("Failed to record pricing audit log", {
      context: "PricingAudit",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
