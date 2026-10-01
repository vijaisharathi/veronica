/**
 * VÉRONA — Support Module Barrel Export
 *
 * Exposes the authoritative customer support services, repositories,
 * state machine, validators, and DTO types.
 */

export * from "./types/support.types";
export * from "./state-machine/support-state-machine";
export * from "./validators/support.validators";
export * from "./repositories/support.repository";
export * from "./services/ticket-number.service";
export * from "./services/sla.service";
export * from "./services/support-context.service";
export * from "./services/support-attachment.service";
export * from "./services/support-event.service";
export * from "./services/support.service";
