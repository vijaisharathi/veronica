/**
 * VÉRONA — Shipment State Machine (Phase 21)
 */

import { ShipmentStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

export const VALID_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  [ShipmentStatus.CREATED]: [
    ShipmentStatus.LABEL_CREATED,
    ShipmentStatus.READY_FOR_PICKUP,
    ShipmentStatus.CANCELLED,
    ShipmentStatus.FAILED,
  ],
  [ShipmentStatus.LABEL_CREATED]: [
    ShipmentStatus.READY_FOR_PICKUP,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.READY_FOR_PICKUP]: [
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.CANCELLED,
    ShipmentStatus.FAILED,
  ],
  [ShipmentStatus.PICKED_UP]: [
    ShipmentStatus.IN_TRANSIT,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RTO_INITIATED,
    ShipmentStatus.FAILED,
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
    ShipmentStatus.RTO_INITIATED,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.FAILED]: [
    ShipmentStatus.RTO_INITIATED,
  ],
  [ShipmentStatus.CANCELLED]: [],
  [ShipmentStatus.RTO_INITIATED]: [
    ShipmentStatus.RTO_IN_TRANSIT,
  ],
  [ShipmentStatus.RTO_IN_TRANSIT]: [
    ShipmentStatus.RTO_DELIVERED,
  ],
  [ShipmentStatus.RTO_DELIVERED]: [],
};

export const TERMINAL_SHIPMENT_STATES: ReadonlySet<ShipmentStatus> = new Set([
  ShipmentStatus.DELIVERED,
  ShipmentStatus.CANCELLED,
  ShipmentStatus.RTO_DELIVERED,
]);

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_SHIPMENT_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function assertValidShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipment(from, to)) {
    throw new AppError(
      `Illegal shipment transition: cannot move from '${from}' to '${to}'.`,
      "INVALID_SHIPMENT_TRANSITION",
      400
    );
  }
}

export function isTerminalShipmentState(status: ShipmentStatus): boolean {
  return TERMINAL_SHIPMENT_STATES.has(status);
}

/**
 * Maps provider-specific status strings to canonical internal ShipmentStatus.
 */
export const PROVIDER_STATUS_MAP: Record<string, ShipmentStatus> = {
  // Generic / common mappings
  "manifested": ShipmentStatus.READY_FOR_PICKUP,
  "label_created": ShipmentStatus.LABEL_CREATED,
  "ready_for_pickup": ShipmentStatus.READY_FOR_PICKUP,
  "dispatched": ShipmentStatus.PICKED_UP,
  "picked_up": ShipmentStatus.PICKED_UP,
  "in_transit": ShipmentStatus.IN_TRANSIT,
  "out_for_delivery": ShipmentStatus.OUT_FOR_DELIVERY,
  "delivered": ShipmentStatus.DELIVERED,
  "delivery_failed": ShipmentStatus.FAILED,
  "failed": ShipmentStatus.FAILED,
  "cancelled": ShipmentStatus.CANCELLED,
  "rto_initiated": ShipmentStatus.RTO_INITIATED,
  "rto_in_transit": ShipmentStatus.RTO_IN_TRANSIT,
  "rto_delivered": ShipmentStatus.RTO_DELIVERED,
  "returned": ShipmentStatus.RTO_DELIVERED,
};

export function mapProviderStatus(providerStatus: string): ShipmentStatus | null {
  const normalized = providerStatus.toLowerCase().replace(/[\s-]+/g, "_");
  return PROVIDER_STATUS_MAP[normalized] ?? null;
}

/**
 * Human-readable labels for shipment statuses (customer-facing).
 */
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.CREATED]: "Shipment Created",
  [ShipmentStatus.LABEL_CREATED]: "Label Created",
  [ShipmentStatus.READY_FOR_PICKUP]: "Ready for Pickup",
  [ShipmentStatus.PICKED_UP]: "Picked Up",
  [ShipmentStatus.IN_TRANSIT]: "In Transit",
  [ShipmentStatus.OUT_FOR_DELIVERY]: "Out for Delivery",
  [ShipmentStatus.DELIVERED]: "Delivered",
  [ShipmentStatus.FAILED]: "Delivery Failed",
  [ShipmentStatus.CANCELLED]: "Cancelled",
  [ShipmentStatus.RTO_INITIATED]: "Returning to Origin",
  [ShipmentStatus.RTO_IN_TRANSIT]: "Return In Transit",
  [ShipmentStatus.RTO_DELIVERED]: "Returned to Origin",
};
