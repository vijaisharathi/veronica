/**
 * VÉRONA — Return Inspection & Disposition Service (Phase 22)
 *
 * Authoritative warehouse operational layer for inspecting returned garments
 * and determining physical disposition (RESTOCK, DAMAGED, DEFECTIVE, etc.).
 *
 * Strict boundaries:
 * - Integrates with Phase 20 InventoryService for RESTOCK (never mutates inventory collections directly)
 * - Restocks ONLY when item inspection result is PASSED
 * - Supports item-level and partial inspection
 * - Emits settlement readiness event (RefundRequested) for Phase 23
 * - NEVER calls payment refund APIs or marks REFUNDED (Phase 23 boundary)
 */

import { returnRepository } from "../repositories/return.repository";
import { returnService } from "./return.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { ReturnStateMachine } from "../state-machine/return-state-machine";
import {
  ReturnStatus,
  InspectionResult,
  ReturnDisposition,
} from "@/constants/status";
import {
  CompleteInspectionInput,
  AssignDispositionInput,
  ReturnAdminDto,
} from "../types/return.types";
import { AuditLogModel } from "@/db/models";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { IStaff, IReturnRequest } from "@/types/database";

export class InspectionService {
  /**
   * Start inspection on a received return package.
   */
  async startInspection(
    idOrNumber: string,
    actorStaff: IStaff
  ): Promise<ReturnAdminDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    if (returnReq.warehouseId) {
      returnService.assertWarehouseScope(returnReq.warehouseId.toString(), actorStaff);
    }

    ReturnStateMachine.assertValidTransition(
      returnReq.status,
      ReturnStatus.INSPECTION,
      returnReq.returnNumber
    );

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), {
      status: ReturnStatus.INSPECTION,
      inspectedBy: actorStaff.email,
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "return.inspection_started",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: ReturnStatus.INSPECTION,
    });

    return returnService.mapToAdminDto(updated!);
  }

  /**
   * Complete inspection with item-level results, conditions, and optional dispositions.
   */
  async completeInspection(
    idOrNumber: string,
    input: CompleteInspectionInput,
    actorStaff: IStaff
  ): Promise<ReturnAdminDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    if (!returnReq.warehouseId) {
      throw new ConflictError(
        `Return ${returnReq.returnNumber} does not have an assigned warehouse facility for inspection.`
      );
    }

    returnService.assertWarehouseScope(returnReq.warehouseId.toString(), actorStaff);

    // Map existing items
    const itemMap = new Map(returnReq.items.map((i) => [i.orderItemId, { ...i }]));

    for (const inspItem of input.items) {
      const existing = itemMap.get(inspItem.orderItemId);
      if (!existing) {
        throw new ValidationError(`Item with orderItemId ${inspItem.orderItemId} is not part of this return.`);
      }

      existing.inspectionResult = inspItem.result;
      existing.condition = inspItem.condition;
      existing.inspectionNotes = inspItem.notes;
      if (inspItem.disposition) {
        existing.disposition = inspItem.disposition;
      }
    }

    const updatedItems = Array.from(itemMap.values());

    // Evaluate restock for items marked RESTOCK that passed inspection
    for (const item of updatedItems) {
      if (
        item.disposition === ReturnDisposition.RESTOCK &&
        item.inspectionResult === InspectionResult.PASSED
      ) {
        // Restock inventory via Phase 20 InventoryService
        try {
          await inventoryService.receiveStock(
            {
              warehouseId: returnReq.warehouseId.toString(),
              variantId: item.variantId.toString(),
              quantity: item.quantity,
              notes: `Restock from passed return ${returnReq.returnNumber} (Item: ${item.sku})`,
            },
            actorStaff
          );

          logger.info("Restocked return item into warehouse", {
            context: "InspectionService",
            metadata: {
              returnNumber: returnReq.returnNumber,
              sku: item.sku,
              quantity: item.quantity,
              warehouseId: returnReq.warehouseId.toString(),
            },
          });
        } catch (err) {
          logger.error("Failed to restock returned item", {
            context: "InspectionService",
            metadata: {
              returnNumber: returnReq.returnNumber,
              sku: item.sku,
              error: err instanceof Error ? err.message : String(err),
            },
          });
          throw new ConflictError(
            `Inventory restock failed for SKU ${item.sku}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    // Determine target return state
    const hasPassed = updatedItems.some(
      (i) => i.inspectionResult === InspectionResult.PASSED || i.inspectionResult === InspectionResult.PARTIAL
    );
    const allInspected = updatedItems.every((i) => Boolean(i.inspectionResult));

    let nextStatus: ReturnStatus = returnReq.status;
    if (allInspected) {
      nextStatus = hasPassed
        ? ReturnStatus.APPROVED_FOR_SETTLEMENT
        : ReturnStatus.REJECTED;
    }

    const updateDoc: Partial<IReturnRequest> = {
      items: updatedItems as any,
      inspectedAt: new Date(),
      inspectedBy: actorStaff.email,
    };

    if (nextStatus !== returnReq.status) {
      ReturnStateMachine.assertValidTransition(
        returnReq.status,
        nextStatus,
        returnReq.returnNumber
      );
      updateDoc.status = nextStatus;
      if (nextStatus === ReturnStatus.APPROVED_FOR_SETTLEMENT) {
        updateDoc.refundRequestedAt = new Date();
      }
    }

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), updateDoc);

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "return.inspection_completed",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: nextStatus,
      reason: input.notes,
    });

    if (nextStatus === ReturnStatus.APPROVED_FOR_SETTLEMENT) {
      logger.info("Return marked APPROVED_FOR_SETTLEMENT; triggering Phase 23 refund initiation", {
        context: "InspectionService",
        metadata: {
          returnNumber: returnReq.returnNumber,
          orderId: returnReq.orderId.toString(),
          eligibleAmountMinor: returnReq.policySnapshot?.eligibleAmountMinor,
        },
      });

      try {
        const { refundService } = await import("@/modules/refunds");
        await refundService.requestReturnRefund(returnReq._id.toString(), actorStaff._id.toString());
      } catch (refundError) {
        logger.error("Automatic refund initiation following return settlement failed", {
          context: "InspectionService",
          metadata: { error: refundError instanceof Error ? refundError.message : String(refundError) },
        });
      }
    }

    return returnService.mapToAdminDto(updated!);
  }

  /**
   * Explicitly assign disposition to inspected items.
   */
  async assignDisposition(
    idOrNumber: string,
    input: AssignDispositionInput,
    actorStaff: IStaff
  ): Promise<ReturnAdminDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    if (!returnReq.warehouseId) {
      throw new ConflictError(
        `Return ${returnReq.returnNumber} has no assigned warehouse for inventory disposition.`
      );
    }

    returnService.assertWarehouseScope(returnReq.warehouseId.toString(), actorStaff);

    const itemMap = new Map(returnReq.items.map((i) => [i.orderItemId, { ...i }]));

    for (const disp of input.items) {
      const item = itemMap.get(disp.orderItemId);
      if (!item) {
        throw new ValidationError(`Order item ${disp.orderItemId} not found in return.`);
      }

      // If updating to RESTOCK from previous non-restock state
      const isNewRestock =
        disp.disposition === ReturnDisposition.RESTOCK &&
        item.disposition !== ReturnDisposition.RESTOCK;

      item.disposition = disp.disposition;

      if (isNewRestock) {
        if (item.inspectionResult !== InspectionResult.PASSED) {
          throw new ConflictError(
            `Cannot RESTOCK item ${item.sku} because inspection result is "${item.inspectionResult || "PENDING"}". Item must PASS inspection before restocking.`
          );
        }

        await inventoryService.receiveStock(
          {
            warehouseId: returnReq.warehouseId.toString(),
            variantId: item.variantId.toString(),
            quantity: item.quantity,
            notes: `Restock disposition for return ${returnReq.returnNumber} (SKU: ${item.sku})`,
          },
          actorStaff
        );
      }
    }

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), {
      items: Array.from(itemMap.values()) as any,
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "return.disposition_assigned",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: returnReq.status,
      reason: input.notes,
    });

    return returnService.mapToAdminDto(updated!);
  }

  private async logAuditEvent(event: {
    actor: string;
    actorType: "CUSTOMER" | "STAFF" | "SYSTEM";
    action: string;
    resourceId: string;
    previousState: string | null;
    newState: string;
    reason?: string;
  }): Promise<void> {
    try {
      await AuditLogModel.create({
        actor: event.actor,
        actorType: event.actorType,
        action: event.action,
        resource: "ReturnRequest",
        resourceId: event.resourceId,
        previousState: event.previousState ? { status: event.previousState } : {},
        newState: { status: event.newState },
        reason: event.reason,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error("Failed to write audit log for inspection", {
        context: "InspectionService",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export const inspectionService = new InspectionService();
