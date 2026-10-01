import { StockReservationStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

export const ALLOWED_RESERVATION_TRANSITIONS: Record<
  StockReservationStatus,
  StockReservationStatus[]
> = {
  [StockReservationStatus.ACTIVE]: [
    StockReservationStatus.RELEASED,
    StockReservationStatus.CONSUMED,
    StockReservationStatus.EXPIRED,
    StockReservationStatus.CANCELLED,
  ],
  [StockReservationStatus.RELEASED]: [],
  [StockReservationStatus.CONSUMED]: [],
  [StockReservationStatus.EXPIRED]: [],
  [StockReservationStatus.CANCELLED]: [],
};

export class ReservationStateMachine {
  /**
   * Validate whether a stock reservation status transition is permitted.
   */
  static canTransition(
    currentStatus: StockReservationStatus,
    targetStatus: StockReservationStatus
  ): boolean {
    if (currentStatus === targetStatus) {
      return true; // Idempotent same-state check
    }

    const allowed = ALLOWED_RESERVATION_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  /**
   * Assert valid transition, throwing a descriptive AppError if invalid.
   */
  static assertValidTransition(
    reservationId: string,
    currentStatus: StockReservationStatus,
    targetStatus: StockReservationStatus
  ): void {
    if (currentStatus === targetStatus) {
      return;
    }

    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new AppError(
        `Invalid reservation transition: Cannot transition reservation '${reservationId}' from ${currentStatus} to ${targetStatus}`,
        "INVALID_RESERVATION_TRANSITION",
        409
      );
    }
  }

  /**
   * Check if reservation is eligible for release
   */
  static isReleasable(status: StockReservationStatus): boolean {
    return status === StockReservationStatus.ACTIVE;
  }

  /**
   * Check if reservation is eligible for consumption
   */
  static isConsumable(status: StockReservationStatus): boolean {
    return status === StockReservationStatus.ACTIVE;
  }
}
