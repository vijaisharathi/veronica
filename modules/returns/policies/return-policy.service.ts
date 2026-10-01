/**
 * VÉRONA — Return Policy Engine (Phase 22)
 *
 * Centralized policy definitions and window evaluation.
 * Enforces business rules for return windows based strictly on delivery date,
 * product returnability, and final-sale exclusions.
 */

import { IOrder, IShipment } from "@/types/database";

export const RETURN_POLICY_CONFIG = {
  RETURN_WINDOW_DAYS: 15,
  EXCHANGE_WINDOW_DAYS: 15,
  POLICY_VERSION: "2026.1",
} as const;

export class ReturnPolicyService {
  readonly version = RETURN_POLICY_CONFIG.POLICY_VERSION;

  /**
   * Get effective return window in days.
   */
  getReturnWindowDays(): number {
    return RETURN_POLICY_CONFIG.RETURN_WINDOW_DAYS;
  }

  /**
   * Get effective exchange window in days.
   */
  getExchangeWindowDays(): number {
    return RETURN_POLICY_CONFIG.EXCHANGE_WINDOW_DAYS;
  }

  /**
   * Evaluates product-level returnability (e.g., final-sale or non-returnable categories).
   */
  evaluateProductReturnability(product: {
    isReturnable?: boolean;
    isFinalSale?: boolean;
  }): { allowed: boolean; reason?: string } {
    if (product.isFinalSale) {
      return {
        allowed: false,
        reason: "Item was marked as Final Sale and is not eligible for return or exchange.",
      };
    }

    if (product.isReturnable === false) {
      return {
        allowed: false,
        reason: "This product is non-returnable per brand hygiene and safety policy.",
      };
    }

    return { allowed: true };
  }

  /**
   * Resolve actual delivery date from shipments or order history.
   * Never falls back to order creation date for return window calculations!
   */
  resolveDeliveryDate(order: IOrder, shipments?: IShipment[]): Date | null {
    // 1. Check associated shipments for confirmed delivery
    if (shipments && shipments.length > 0) {
      const deliveredShipments = shipments
        .filter((s) => s.status === "DELIVERED" && s.deliveredAt)
        .sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime());

      if (deliveredShipments[0]?.deliveredAt) {
        return new Date(deliveredShipments[0].deliveredAt);
      }
    }

    // 2. If order status is DELIVERED, fallback to order updatedAt (when status transitioned)
    if (order.status === "DELIVERED") {
      return new Date(order.updatedAt);
    }

    return null;
  }

  /**
   * Calculate exact expiration date for the return window.
   */
  calculateWindowExpiry(deliveryDate: Date, windowDays: number = this.getReturnWindowDays()): Date {
    const expiry = new Date(deliveryDate.getTime());
    expiry.setDate(expiry.getDate() + windowDays);
    return expiry;
  }

  /**
   * Check if current time is within the return window.
   */
  isWithinReturnWindow(
    deliveryDate: Date,
    windowDays: number = this.getReturnWindowDays(),
    now: Date = new Date()
  ): boolean {
    const expiry = this.calculateWindowExpiry(deliveryDate, windowDays);
    return now.getTime() <= expiry.getTime();
  }
}

export const returnPolicyService = new ReturnPolicyService();
