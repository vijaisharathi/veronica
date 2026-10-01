/**
 * VÉRONA — Support SLA Calculation & Policy Service (Phase 26)
 *
 * Implements deterministic SLA deadline computation based on ticket priority,
 * real-time server-side state evaluation (ON_TRACK, AT_RISK, BREACHED),
 * and first-response metric tracking.
 */

import {
  SupportTicketPriority,
  SupportSlaState,
} from "@/constants/status";
import { SupportSlaInfo } from "../types/support.types";

export interface SlaConfiguration {
  firstResponseHours: number;
  resolutionHours: number;
}

export const SLA_POLICY: Record<SupportTicketPriority, SlaConfiguration> = {
  [SupportTicketPriority.URGENT]: {
    firstResponseHours: 2,
    resolutionHours: 12,
  },
  [SupportTicketPriority.HIGH]: {
    firstResponseHours: 4,
    resolutionHours: 24,
  },
  [SupportTicketPriority.MEDIUM]: {
    firstResponseHours: 12,
    resolutionHours: 48,
  },
  [SupportTicketPriority.LOW]: {
    firstResponseHours: 24,
    resolutionHours: 72,
  },
};

export const DEFAULT_SLA_CONFIG = SLA_POLICY;

export class SlaService {
  /**
   * Computes the initial first response and resolution deadlines from ticket creation.
   */
  calculateDeadlines(
    createdAt: Date,
    priority: SupportTicketPriority = SupportTicketPriority.MEDIUM
  ): { firstResponseDeadline: Date; resolutionDeadline: Date } {
    const config = SLA_POLICY[priority] || SLA_POLICY[SupportTicketPriority.MEDIUM];

    const firstResponseDeadline = new Date(
      createdAt.getTime() + config.firstResponseHours * 60 * 60 * 1000
    );
    const resolutionDeadline = new Date(
      createdAt.getTime() + config.resolutionHours * 60 * 60 * 1000
    );

    return { firstResponseDeadline, resolutionDeadline };
  }

  /**
   * Evaluates current SLA state based on timestamps and deadlines.
   * Completely server-authoritative.
   */
  evaluateSlaState(ticket: {
    createdAt: Date;
    firstResponseAt?: Date | null;
    resolvedAt?: Date | null;
    closedAt?: Date | null;
    slaFirstResponseDeadline?: Date | null;
    slaResolutionDeadline?: Date | null;
  }): SupportSlaInfo {
    const now = Date.now();

    // 1. Evaluate First Response SLA
    let firstResponseState: SupportSlaState = SupportSlaState.ON_TRACK;

    if (ticket.slaFirstResponseDeadline) {
      const deadline = ticket.slaFirstResponseDeadline.getTime();

      if (ticket.firstResponseAt) {
        // Response already delivered
        firstResponseState =
          ticket.firstResponseAt.getTime() <= deadline
            ? SupportSlaState.ON_TRACK
            : SupportSlaState.BREACHED;
      } else {
        // Pending response
        if (now > deadline) {
          firstResponseState = SupportSlaState.BREACHED;
        } else if (now + 60 * 60 * 1000 > deadline) {
          // Within 1 hour of breach
          firstResponseState = SupportSlaState.AT_RISK;
        } else {
          firstResponseState = SupportSlaState.ON_TRACK;
        }
      }
    }

    // 2. Evaluate Resolution SLA
    let resolutionState: SupportSlaState = SupportSlaState.ON_TRACK;

    if (ticket.slaResolutionDeadline) {
      const deadline = ticket.slaResolutionDeadline.getTime();
      const completionTime = ticket.resolvedAt || ticket.closedAt;

      if (completionTime) {
        // Ticket resolved or closed
        resolutionState =
          completionTime.getTime() <= deadline
            ? SupportSlaState.ON_TRACK
            : SupportSlaState.BREACHED;
      } else {
        // Still open
        if (now > deadline) {
          resolutionState = SupportSlaState.BREACHED;
        } else if (now + 4 * 60 * 60 * 1000 > deadline) {
          // Within 4 hours of breach
          resolutionState = SupportSlaState.AT_RISK;
        } else {
          resolutionState = SupportSlaState.ON_TRACK;
        }
      }
    }

    const isBreached =
      firstResponseState === SupportSlaState.BREACHED ||
      resolutionState === SupportSlaState.BREACHED;

    const state: SupportSlaState = isBreached
      ? SupportSlaState.BREACHED
      : firstResponseState === SupportSlaState.AT_RISK ||
        resolutionState === SupportSlaState.AT_RISK
      ? SupportSlaState.AT_RISK
      : SupportSlaState.ON_TRACK;

    return {
      state,
      firstResponseDeadline: ticket.slaFirstResponseDeadline?.toISOString(),
      resolutionDeadline: ticket.slaResolutionDeadline?.toISOString(),
      firstResponseAt: ticket.firstResponseAt?.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString(),
      firstResponseState,
      resolutionState,
      isBreached,
    };
  }
}

export const slaService = new SlaService();
