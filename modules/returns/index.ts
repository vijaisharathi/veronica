/**
 * VÉRONA — Returns & Exchanges Module (Phase 22)
 *
 * Authoritative module exports for return eligibility, lifecycle management,
 * QC inspection, inventory restock integration, and garment exchanges.
 */

export * from "./types/return.types";
export * from "./validators/return.validators";
export * from "./policies/return-policy.service";
export * from "./eligibility/return-eligibility.service";
export * from "./state-machine/return-state-machine";
export * from "./state-machine/exchange-state-machine";
export * from "./repositories/return.repository";
export * from "./services/return.service";
export * from "./services/inspection.service";
export * from "./services/exchange.service";
