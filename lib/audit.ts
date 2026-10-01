/**
 * VÉRONA — Centralized Audit Logging Utility (Phase 28)
 *
 * Provides a standardized, safe, append-only interface to write administrative
 * mutations to the AuditLog collection without throwing if audit writes fail.
 */

import { AuditLogModel } from "@/db/models";
import { AuditActorType } from "@/constants/status";
import { logger } from "@/lib/logger";

export interface LogAuditOptions {
  actorId: string;
  actorType?: AuditActorType;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | object;
  after?: Record<string, unknown> | object;
  metadata?: Record<string, unknown> | object;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditTrail(options: LogAuditOptions): Promise<void> {
  try {
    const meta = {
      ...options.metadata,
      ...(options.actorEmail ? { actorEmail: options.actorEmail } : {}),
    };

    await AuditLogModel.create({
      actorId: options.actorId,
      actorType: options.actorType || AuditActorType.STAFF,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      before: options.before as Record<string, unknown> | undefined,
      after: options.after as Record<string, unknown> | undefined,
      metadata: meta as Record<string, unknown>,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
  } catch (error) {
    logger.error("Failed to write audit log entry", {
      error: error instanceof Error ? error.message : "Unknown audit error",
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
    }, "AuditLogger");
  }
}
