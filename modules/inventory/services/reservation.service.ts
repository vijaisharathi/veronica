import { inventoryRepository } from "../repositories/inventory.repository";
import { warehouseAllocationService } from "./warehouse-allocation.service";
import { ReservationStateMachine } from "../state-machine/reservation-state-machine";
import {
  ReserveStockInput,
  ReleaseStockInput,
  ConsumeStockInput,
  StockReservationDto,
} from "../types/inventory.types";
import { StockReservationStatus } from "@/constants/status";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export class ReservationService {
  /**
   * Reserve stock for an item at checkout or cart transition.
   * If warehouseId is not specified, uses WarehouseAllocationService.
   */
  async reserveItem(
    input: ReserveStockInput,
    actor = "SYSTEM"
  ): Promise<StockReservationDto> {
    const {
      variantId,
      quantity,
      referenceType,
      referenceId,
      expiresInMinutes = 30,
      metadata = {},
    } = input;

    let targetWarehouseId = input.warehouseId;

    // If warehouse was not provided, allocate one
    if (!targetWarehouseId) {
      const allocationResult = await warehouseAllocationService.allocate([
        { variantId, quantity },
      ]);

      if (!allocationResult.success || allocationResult.allocations.length === 0 || !allocationResult.allocations[0]) {
        throw new ConflictError(
          `Insufficient stock available for variant ${variantId} to satisfy reservation of ${quantity} units`
        );
      }
      targetWarehouseId = allocationResult.allocations[0].warehouseId;
    }

    const reservationId = `RES-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const { reservation } = await inventoryRepository.reserveStock({
      warehouseId: targetWarehouseId!,
      variantId,
      quantity,
      referenceType,
      referenceId,
      expiresAt,
      reservationId,
      performedBy: actor,
      metadata,
    });

    logger.info("Stock reservation created", {
      context: "ReservationService",
      metadata: {
        reservationId: reservation.reservationId,
        variantId,
        warehouseId: targetWarehouseId,
        quantity,
        referenceType,
        referenceId,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      id: reservation._id.toString(),
      reservationId: reservation.reservationId,
      referenceType: reservation.referenceType,
      referenceId: reservation.referenceId,
      variantId: reservation.variantId.toString(),
      warehouseId: reservation.warehouseId.toString(),
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt.toISOString(),
      releasedAt: reservation.releasedAt?.toISOString() || null,
      consumedAt: reservation.consumedAt?.toISOString() || null,
      createdAt: reservation.createdAt.toISOString(),
      metadata: reservation.metadata,
    };
  }

  /**
   * Release reservation idempotently
   */
  async releaseReservation(
    input: ReleaseStockInput,
    actor = "SYSTEM"
  ): Promise<{ success: boolean; releasedCount: number }> {
    if (input.reservationId) {
      const existing = await inventoryRepository.findReservationById(input.reservationId);
      if (!existing) {
        throw new NotFoundError("StockReservation", input.reservationId);
      }

      if (existing.status === StockReservationStatus.RELEASED) {
        return { success: true, releasedCount: 0 }; // Idempotent
      }

      ReservationStateMachine.assertValidTransition(
        existing.reservationId,
        existing.status,
        StockReservationStatus.RELEASED
      );

      await inventoryRepository.releaseReservation(
        input.reservationId,
        actor,
        input.reason || "Manual release"
      );

      logger.info("Stock reservation released", {
        context: "ReservationService",
        metadata: { reservationId: input.reservationId, actor },
      });

      return { success: true, releasedCount: 1 };
    }

    if (input.referenceType && input.referenceId) {
      const reservations = await inventoryRepository.findReservationsByReference(
        input.referenceType,
        input.referenceId
      );

      let count = 0;
      for (const res of reservations) {
        if (res.status === StockReservationStatus.ACTIVE) {
          await inventoryRepository.releaseReservation(
            res.reservationId,
            actor,
            input.reason || `Released for ${input.referenceType} ${input.referenceId}`
          );
          count++;
        }
      }

      logger.info("Released stock reservations by reference", {
        context: "ReservationService",
        metadata: {
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          count,
        },
      });

      return { success: true, releasedCount: count };
    }

    return { success: false, releasedCount: 0 };
  }

  /**
   * Consume reservation on confirmed order
   */
  async consumeReservation(
    input: ConsumeStockInput,
    actor = "SYSTEM"
  ): Promise<{ success: boolean; consumedCount: number }> {
    if (input.reservationId) {
      const existing = await inventoryRepository.findReservationById(input.reservationId);
      if (!existing) {
        throw new NotFoundError("StockReservation", input.reservationId);
      }

      if (existing.status === StockReservationStatus.CONSUMED) {
        return { success: true, consumedCount: 0 }; // Idempotent
      }

      ReservationStateMachine.assertValidTransition(
        existing.reservationId,
        existing.status,
        StockReservationStatus.CONSUMED
      );

      await inventoryRepository.consumeReservation(input.reservationId, actor);

      logger.info("Stock reservation consumed", {
        context: "ReservationService",
        metadata: { reservationId: input.reservationId, actor },
      });

      return { success: true, consumedCount: 1 };
    }

    if (input.referenceType && input.referenceId) {
      const reservations = await inventoryRepository.findReservationsByReference(
        input.referenceType,
        input.referenceId
      );

      let count = 0;
      for (const res of reservations) {
        if (res.status === StockReservationStatus.ACTIVE) {
          await inventoryRepository.consumeReservation(res.reservationId, actor);
          count++;
        }
      }

      logger.info("Consumed stock reservations by reference", {
        context: "ReservationService",
        metadata: {
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          count,
        },
      });

      return { success: true, consumedCount: count };
    }

    return { success: false, consumedCount: 0 };
  }

  /**
   * Scheduled or triggered cleanup of expired active reservations
   */
  async cleanupExpiredReservations(limit = 100): Promise<{ expiredCount: number }> {
    const expiredList = await inventoryRepository.findExpiredReservations(limit);
    let expiredCount = 0;

    for (const res of expiredList) {
      try {
        await inventoryRepository.expireReservation(res.reservationId);
        expiredCount++;
      } catch (err) {
        logger.error("Failed to expire reservation during cleanup", {
          context: "ReservationService",
          metadata: { reservationId: res.reservationId, error: String(err) },
        });
      }
    }

    if (expiredCount > 0) {
      logger.info("Expired reservations cleaned up", {
        context: "ReservationService",
        metadata: { count: expiredCount },
      });
    }

    return { expiredCount };
  }
}

export const reservationService = new ReservationService();
