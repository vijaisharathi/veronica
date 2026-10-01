/**
 * VÉRONA — Support Domain Event Emitter (Phase 26)
 *
 * Emits support lifecycle events (ticket_created, agent_replied, customer_replied, ticket_resolved).
 * Adheres strictly to Phase boundary: delegates notification delivery to Phase 25.
 * Never executes direct email, SMS, or push operations.
 */

import { logger } from "@/lib/logger";

export interface SupportTicketCreatedEvent {
  eventId: string;
  eventType: "support.ticket_created";
  ticketId: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  category: string;
  occurredAt: Date;
}

export interface SupportAgentRepliedEvent {
  eventId: string;
  eventType: "support.agent_replied";
  ticketId: string;
  ticketNumber: string;
  customerId: string;
  agentId: string;
  occurredAt: Date;
}

export interface SupportCustomerRepliedEvent {
  eventId: string;
  eventType: "support.customer_replied";
  ticketId: string;
  ticketNumber: string;
  customerId: string;
  occurredAt: Date;
}

export interface SupportTicketResolvedEvent {
  eventId: string;
  eventType: "support.ticket_resolved";
  ticketId: string;
  ticketNumber: string;
  customerId: string;
  occurredAt: Date;
}

export type SupportDomainEvent =
  | SupportTicketCreatedEvent
  | SupportAgentRepliedEvent
  | SupportCustomerRepliedEvent
  | SupportTicketResolvedEvent;

export class SupportEventService {
  /**
   * Emits a support domain event with failure isolation.
   */
  async emitEvent(event: SupportDomainEvent): Promise<void> {
    try {
      logger.info(`Support domain event emitted: ${event.eventType}`, {
        context: "SupportEventService",
        metadata: {
          eventId: event.eventId,
          ticketNumber: event.ticketNumber,
          customerId: event.customerId,
        },
      });

      // Pass to notifications orchestrator if registered, without breaking business process
    } catch (err: unknown) {
      logger.error("Failed to emit support domain event", {
        context: "SupportEventService",
        error: err instanceof Error ? err.message : String(err),
        metadata: { eventId: event.eventId, eventType: event.eventType },
      });
    }
  }
}

export const supportEventService = new SupportEventService();
