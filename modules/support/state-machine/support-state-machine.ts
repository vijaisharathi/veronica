/**
 * VÉRONA — Support Ticket State Machine (Phase 26)
 *
 * Implements deterministic status transitions, legal transition validation,
 * and actor-specific state capability predicates.
 */

import { SupportTicketStatus } from "@/constants/status";
import { ValidationError } from "@/lib/errors";

export const VALID_TICKET_TRANSITIONS: Record<SupportTicketStatus, readonly SupportTicketStatus[]> = {
  [SupportTicketStatus.OPEN]: [
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.CLOSED,
  ],
  [SupportTicketStatus.IN_PROGRESS]: [
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
  ],
  [SupportTicketStatus.WAITING_FOR_CUSTOMER]: [
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
  ],
  [SupportTicketStatus.RESOLVED]: [
    SupportTicketStatus.CLOSED,
    SupportTicketStatus.REOPENED,
  ],
  [SupportTicketStatus.CLOSED]: [
    SupportTicketStatus.REOPENED,
  ],
  [SupportTicketStatus.REOPENED]: [
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
  ],
};

/**
 * Checks whether a transition between two support ticket statuses is legally allowed.
 */
export function canTransitionTicket(
  currentStatus: SupportTicketStatus,
  targetStatus: SupportTicketStatus
): boolean {
  if (currentStatus === targetStatus) {
    return true; // No-op transition
  }

  const allowed = VALID_TICKET_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export const isValidTicketTransition = canTransitionTicket;

/**
 * Throws a ValidationError if the transition is illegal.
 */
export function assertValidTicketTransition(
  currentStatus: SupportTicketStatus,
  targetStatus: SupportTicketStatus
): void {
  if (!canTransitionTicket(currentStatus, targetStatus)) {
    throw new ValidationError(
      `Cannot transition support ticket from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${
        (VALID_TICKET_TRANSITIONS[currentStatus] || []).join(", ")
      }]`
    );
  }
}

/**
 * Predicate: Can a customer send a reply to this ticket?
 */
export function canCustomerReply(status: SupportTicketStatus): boolean {
  return ([
    SupportTicketStatus.OPEN,
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.REOPENED,
  ] as SupportTicketStatus[]).includes(status);
}

/**
 * Predicate: Can a customer close/cancel this ticket?
 */
export function canCustomerClose(status: SupportTicketStatus): boolean {
  return ([
    SupportTicketStatus.OPEN,
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.REOPENED,
  ] as SupportTicketStatus[]).includes(status);
}

/**
 * Predicate: Can a customer reopen this ticket?
 */
export function canCustomerReopen(status: SupportTicketStatus, closedAt?: Date | null): boolean {
  if (status !== SupportTicketStatus.RESOLVED && status !== SupportTicketStatus.CLOSED) {
    return false;
  }

  // Policy: Reopen allowed within 14 days of resolution/closure
  if (closedAt) {
    const elapsedDays = (Date.now() - closedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (elapsedDays > 14) {
      return false;
    }
  }

  return true;
}

/**
 * Predicate: Is the ticket currently closed or resolved?
 */
export function isTerminalOrResolved(status: SupportTicketStatus): boolean {
  return status === SupportTicketStatus.CLOSED || status === SupportTicketStatus.RESOLVED;
}
