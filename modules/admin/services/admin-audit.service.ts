/**
 * VÉRONA — Admin Audit Log Service (Phase 29)
 *
 * Provides immutable, append-only administrative query, inspection,
 * and audited export functionality across all system mutations.
 */

import mongoose from "mongoose";
import { AuditLogModel } from "@/db/models";
import { IAuditLog, IStaff } from "@/types/database";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { logAuditTrail } from "@/lib/audit";
import { AdminAuditListQuery, AdminAuditExportQuery } from "../validators/admin-audit.validation";
import { AdminAuditLogDTO } from "../types/admin-management.types";

export class AdminAuditService {
  /**
   * Lists audit logs with server-side pagination, structured filters, and text search.
   */
  async listAuditLogs(query: AdminAuditListQuery): Promise<{
    data: AdminAuditLogDTO[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.actorId) filter.actorId = query.actorId;
    if (query.actorType) filter.actorType = query.actorType;
    if (query.action) filter.action = query.action;
    if (query.entityType) filter.entityType = query.entityType;
    if (query.entityId) filter.entityId = query.entityId;

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.createdAt = dateFilter;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { action: searchRegex },
        { entityType: searchRegex },
        { entityId: searchRegex },
        { actorId: searchRegex },
      ];
    }

    const sortField = query.sortBy || "createdAt";
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;

    const [total, logs] = await Promise.all([
      AuditLogModel.countDocuments(filter),
      AuditLogModel.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean<IAuditLog[]>(),
    ]);

    const data: AdminAuditLogDTO[] = logs.map((l) => ({
      id: l._id.toString(),
      actorId: l.actorId,
      actorType: l.actorType,
      actorEmail: (l.metadata as Record<string, unknown>)?.actorEmail as string | undefined,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      before: l.before as Record<string, unknown> | null,
      after: l.after as Record<string, unknown> | null,
      metadata: l.metadata as Record<string, unknown>,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: new Date(l.createdAt),
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single audit log record by ID.
   */
  async getAuditLog(id: string): Promise<AdminAuditLogDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid audit log ID format");
    }

    const log = await AuditLogModel.findById(id).lean<IAuditLog>();
    if (!log) {
      throw new NotFoundError(`Audit log with ID '${id}' not found`);
    }

    return {
      id: log._id.toString(),
      actorId: log.actorId,
      actorType: log.actorType,
      actorEmail: (log.metadata as Record<string, unknown>)?.actorEmail as string | undefined,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      before: log.before as Record<string, unknown> | null,
      after: log.after as Record<string, unknown> | null,
      metadata: log.metadata as Record<string, unknown>,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: new Date(log.createdAt),
    };
  }

  /**
   * Generates a controlled export of audit logs and records an audit trail for the export.
   */
  async exportAuditLogs(
    query: AdminAuditExportQuery,
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<Array<Record<string, unknown>>> {
    const filter: Record<string, unknown> = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.action) filter.action = query.action;
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.createdAt = dateFilter;
    }

    const logs = await AuditLogModel.find(filter)
      .limit(1000)
      .sort({ createdAt: -1 })
      .lean<IAuditLog[]>();

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action: "audit.exported",
      entityType: "AuditLog",
      entityId: "bulk",
      metadata: {
        count: logs.length,
        format: query.format,
        entityType: query.entityType,
        action: query.action,
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return logs.map((l) => ({
      id: l._id.toString(),
      actorId: l.actorId,
      actorType: l.actorType,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    }));
  }
}

export const adminAuditService = new AdminAuditService();
