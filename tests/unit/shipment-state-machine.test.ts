import { describe, it, expect } from "vitest";
import {
  canTransitionShipment,
  assertValidShipmentTransition,
  isTerminalShipmentState,
  mapProviderStatus,
  SHIPMENT_STATUS_LABELS,
} from "@/modules/fulfillment/state-machine/shipment-state-machine";
import { ShipmentStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

describe("Phase 21 — Shipment State Machine Unit Tests", () => {
  describe("Valid Shipment Transitions", () => {
    it("allows CREATED -> LABEL_CREATED, READY_FOR_PICKUP, CANCELLED, FAILED", () => {
      expect(canTransitionShipment(ShipmentStatus.CREATED, ShipmentStatus.LABEL_CREATED)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.CREATED, ShipmentStatus.READY_FOR_PICKUP)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.CREATED, ShipmentStatus.CANCELLED)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.CREATED, ShipmentStatus.FAILED)).toBe(true);
      expect(() =>
        assertValidShipmentTransition(ShipmentStatus.CREATED, ShipmentStatus.LABEL_CREATED)
      ).not.toThrow();
    });

    it("allows LABEL_CREATED -> READY_FOR_PICKUP and CANCELLED", () => {
      expect(canTransitionShipment(ShipmentStatus.LABEL_CREATED, ShipmentStatus.READY_FOR_PICKUP)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.LABEL_CREATED, ShipmentStatus.CANCELLED)).toBe(true);
    });

    it("allows READY_FOR_PICKUP -> PICKED_UP", () => {
      expect(canTransitionShipment(ShipmentStatus.READY_FOR_PICKUP, ShipmentStatus.PICKED_UP)).toBe(true);
    });

    it("allows PICKED_UP -> IN_TRANSIT", () => {
      expect(canTransitionShipment(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT)).toBe(true);
    });

    it("allows IN_TRANSIT -> OUT_FOR_DELIVERY and DELIVERED", () => {
      expect(canTransitionShipment(ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED)).toBe(true);
    });

    it("allows OUT_FOR_DELIVERY -> DELIVERED and FAILED", () => {
      expect(canTransitionShipment(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.FAILED)).toBe(true);
    });

    it("allows RTO flow: IN_TRANSIT -> RTO_INITIATED -> RTO_IN_TRANSIT -> RTO_DELIVERED", () => {
      expect(canTransitionShipment(ShipmentStatus.IN_TRANSIT, ShipmentStatus.RTO_INITIATED)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.RTO_INITIATED, ShipmentStatus.RTO_IN_TRANSIT)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.RTO_IN_TRANSIT, ShipmentStatus.RTO_DELIVERED)).toBe(true);
    });

    it("allows idempotent transition to the identical shipment status", () => {
      expect(canTransitionShipment(ShipmentStatus.IN_TRANSIT, ShipmentStatus.IN_TRANSIT)).toBe(true);
      expect(canTransitionShipment(ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERED)).toBe(true);
    });
  });

  describe("Invalid Transitions & Terminal States", () => {
    it("rejects DELIVERED -> IN_TRANSIT (terminal state)", () => {
      expect(canTransitionShipment(ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT)).toBe(false);
      expect(() =>
        assertValidShipmentTransition(ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT)
      ).toThrow(AppError);
    });

    it("rejects CANCELLED -> DELIVERED", () => {
      expect(canTransitionShipment(ShipmentStatus.CANCELLED, ShipmentStatus.DELIVERED)).toBe(false);
    });

    it("rejects CREATED -> DELIVERED directly", () => {
      expect(canTransitionShipment(ShipmentStatus.CREATED, ShipmentStatus.DELIVERED)).toBe(false);
    });

    it("correctly identifies terminal shipment states", () => {
      expect(isTerminalShipmentState(ShipmentStatus.DELIVERED)).toBe(true);
      expect(isTerminalShipmentState(ShipmentStatus.CANCELLED)).toBe(true);
      expect(isTerminalShipmentState(ShipmentStatus.RTO_DELIVERED)).toBe(true);

      expect(isTerminalShipmentState(ShipmentStatus.IN_TRANSIT)).toBe(false);
      expect(isTerminalShipmentState(ShipmentStatus.OUT_FOR_DELIVERY)).toBe(false);
    });
  });

  describe("Carrier Status Normalization", () => {
    it("maps standard external status strings correctly", () => {
      expect(mapProviderStatus("manifested")).toBe(ShipmentStatus.READY_FOR_PICKUP);
      expect(mapProviderStatus("in_transit")).toBe(ShipmentStatus.IN_TRANSIT);
      expect(mapProviderStatus("In-Transit")).toBe(ShipmentStatus.IN_TRANSIT);
      expect(mapProviderStatus("OUT FOR DELIVERY")).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
      expect(mapProviderStatus("delivered")).toBe(ShipmentStatus.DELIVERED);
      expect(mapProviderStatus("Delivered")).toBe(ShipmentStatus.DELIVERED);
      expect(mapProviderStatus("rto_initiated")).toBe(ShipmentStatus.RTO_INITIATED);
    });

    it("returns null for unrecognized provider status", () => {
      expect(mapProviderStatus("UNKNOWN_PROVIDER_CODE_XYZ")).toBeNull();
    });
  });

  describe("Customer-facing Labels", () => {
    it("provides human-readable labels for all shipment statuses", () => {
      for (const status of Object.values(ShipmentStatus)) {
        expect(SHIPMENT_STATUS_LABELS[status]).toBeDefined();
        expect(typeof SHIPMENT_STATUS_LABELS[status]).toBe("string");
        expect(SHIPMENT_STATUS_LABELS[status].length).toBeGreaterThan(0);
      }
    });
  });
});
