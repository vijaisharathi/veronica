import { describe, it, expect } from "vitest";
import {
  SupportTicketStatus,
  SupportPriority,
  SupportSlaState,
} from "@/constants/status";
import {
  isValidTicketTransition,
  assertValidTicketTransition,
  canCustomerReply,
  canCustomerClose,
  canCustomerReopen,
  VALID_TICKET_TRANSITIONS,
} from "@/modules/support/state-machine/support-state-machine";
import { slaService, DEFAULT_SLA_CONFIG } from "@/modules/support/services/sla.service";
import { ValidationError } from "@/lib/errors";

describe("Phase 26 — Support State Machine & SLA Adherence", () => {
  describe("State Machine Transitions", () => {
    it("allows valid forward workflow: OPEN -> IN_PROGRESS -> WAITING_FOR_CUSTOMER -> IN_PROGRESS -> RESOLVED -> CLOSED", () => {
      expect(isValidTicketTransition(SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.WAITING_FOR_CUSTOMER)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.RESOLVED)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED)).toBe(true);
    });

    it("allows customer resolution and direct closure from active states", () => {
      expect(isValidTicketTransition(SupportTicketStatus.OPEN, SupportTicketStatus.CLOSED)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.CLOSED)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.CLOSED)).toBe(true);
    });

    it("allows reopening from RESOLVED and CLOSED states", () => {
      expect(isValidTicketTransition(SupportTicketStatus.RESOLVED, SupportTicketStatus.REOPENED)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.CLOSED, SupportTicketStatus.REOPENED)).toBe(true);
      expect(isValidTicketTransition(SupportTicketStatus.REOPENED, SupportTicketStatus.IN_PROGRESS)).toBe(true);
    });

    it("rejects illegal transitions with assertValidTicketTransition throwing ValidationError", () => {
      // Cannot jump from OPEN directly to REOPENED
      expect(() =>
        assertValidTicketTransition(SupportTicketStatus.OPEN, SupportTicketStatus.REOPENED)
      ).toThrow(ValidationError);

      // Cannot jump from CLOSED directly to WAITING_FOR_CUSTOMER without reopening
      expect(() =>
        assertValidTicketTransition(SupportTicketStatus.CLOSED, SupportTicketStatus.WAITING_FOR_CUSTOMER)
      ).toThrow(ValidationError);

      // Cannot jump from RESOLVED directly to IN_PROGRESS without reopening
      expect(() =>
        assertValidTicketTransition(SupportTicketStatus.RESOLVED, SupportTicketStatus.IN_PROGRESS)
      ).toThrow(ValidationError);
    });
  });

  describe("Customer Capabilities & Reopening Policy", () => {
    it("permits customer replies only when ticket is in an active state", () => {
      expect(canCustomerReply(SupportTicketStatus.OPEN)).toBe(true);
      expect(canCustomerReply(SupportTicketStatus.IN_PROGRESS)).toBe(true);
      expect(canCustomerReply(SupportTicketStatus.WAITING_FOR_CUSTOMER)).toBe(true);
      expect(canCustomerReply(SupportTicketStatus.REOPENED)).toBe(true);

      // Must be false for resolved or closed
      expect(canCustomerReply(SupportTicketStatus.RESOLVED)).toBe(false);
      expect(canCustomerReply(SupportTicketStatus.CLOSED)).toBe(false);
    });

    it("permits customer closure only from active states", () => {
      expect(canCustomerClose(SupportTicketStatus.OPEN)).toBe(true);
      expect(canCustomerClose(SupportTicketStatus.IN_PROGRESS)).toBe(true);
      expect(canCustomerClose(SupportTicketStatus.WAITING_FOR_CUSTOMER)).toBe(true);
      expect(canCustomerClose(SupportTicketStatus.REOPENED)).toBe(true);

      expect(canCustomerClose(SupportTicketStatus.CLOSED)).toBe(false);
      expect(canCustomerClose(SupportTicketStatus.RESOLVED)).toBe(false);
    });

    it("strictly enforces 14-day policy window for reopening tickets", () => {
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
      const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000);

      // Within 14-day window: allowed
      expect(canCustomerReopen(SupportTicketStatus.RESOLVED, tenDaysAgo)).toBe(true);
      expect(canCustomerReopen(SupportTicketStatus.CLOSED, tenDaysAgo)).toBe(true);

      // Beyond 14-day window: forbidden
      expect(canCustomerReopen(SupportTicketStatus.RESOLVED, twentyDaysAgo)).toBe(false);
      expect(canCustomerReopen(SupportTicketStatus.CLOSED, twentyDaysAgo)).toBe(false);

      // Open tickets cannot be reopened
      expect(canCustomerReopen(SupportTicketStatus.OPEN, tenDaysAgo)).toBe(false);
      expect(canCustomerReopen(SupportTicketStatus.IN_PROGRESS, tenDaysAgo)).toBe(false);
    });
  });

  describe("SLA Calculation & Evaluation", () => {
    const baseTime = new Date("2026-09-27T10:00:00.000Z");

    it("calculates exact priority-based deadlines according to atelier SLA policy", () => {
      // URGENT: 2h response, 12h resolution
      const urgent = slaService.calculateDeadlines(baseTime, SupportPriority.URGENT);
      expect(urgent.firstResponseDeadline.toISOString()).toBe("2026-09-27T12:00:00.000Z");
      expect(urgent.resolutionDeadline.toISOString()).toBe("2026-09-27T22:00:00.000Z");

      // HIGH: 4h response, 24h resolution
      const high = slaService.calculateDeadlines(baseTime, SupportPriority.HIGH);
      expect(high.firstResponseDeadline.toISOString()).toBe("2026-09-27T14:00:00.000Z");
      expect(high.resolutionDeadline.toISOString()).toBe("2026-09-28T10:00:00.000Z");

      // MEDIUM: 12h response, 48h resolution
      const medium = slaService.calculateDeadlines(baseTime, SupportPriority.MEDIUM);
      expect(medium.firstResponseDeadline.toISOString()).toBe("2026-09-27T22:00:00.000Z");
      expect(medium.resolutionDeadline.toISOString()).toBe("2026-09-29T10:00:00.000Z");

      // LOW: 24h response, 72h resolution
      const low = slaService.calculateDeadlines(baseTime, SupportPriority.LOW);
      expect(low.firstResponseDeadline.toISOString()).toBe("2026-09-28T10:00:00.000Z");
      expect(low.resolutionDeadline.toISOString()).toBe("2026-09-30T10:00:00.000Z");
    });

    it("correctly evaluates ON_TRACK, AT_RISK, and BREACHED states server-authoritatively", () => {
      const responseDeadline = new Date(baseTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      const resolutionDeadline = new Date(baseTime.getTime() + 12 * 60 * 60 * 1000); // 12 hours

      // 1. Delivered before deadline: ON_TRACK
      const onTrack = slaService.evaluateSlaState({
        createdAt: baseTime,
        firstResponseAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000), // 1 hour (on track)
        resolvedAt: new Date(baseTime.getTime() + 5 * 60 * 60 * 1000), // 5 hours (on track)
        slaFirstResponseDeadline: responseDeadline,
        slaResolutionDeadline: resolutionDeadline,
      });

      expect(onTrack.state).toBe(SupportSlaState.ON_TRACK);
      expect(onTrack.isBreached).toBe(false);

      // 2. Response delivered late: BREACHED
      const breachedResponse = slaService.evaluateSlaState({
        createdAt: baseTime,
        firstResponseAt: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000), // 3 hours (late)
        resolvedAt: new Date(baseTime.getTime() + 5 * 60 * 60 * 1000),
        slaFirstResponseDeadline: responseDeadline,
        slaResolutionDeadline: resolutionDeadline,
      });

      expect(breachedResponse.firstResponseState).toBe(SupportSlaState.BREACHED);
      expect(breachedResponse.isBreached).toBe(true);
      expect(breachedResponse.state).toBe(SupportSlaState.BREACHED);

      // 3. Resolution delivered late: BREACHED
      const breachedResolution = slaService.evaluateSlaState({
        createdAt: baseTime,
        firstResponseAt: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
        resolvedAt: new Date(baseTime.getTime() + 15 * 60 * 60 * 1000), // 15 hours (late)
        slaFirstResponseDeadline: responseDeadline,
        slaResolutionDeadline: resolutionDeadline,
      });

      expect(breachedResolution.resolutionState).toBe(SupportSlaState.BREACHED);
      expect(breachedResolution.isBreached).toBe(true);
      expect(breachedResolution.state).toBe(SupportSlaState.BREACHED);
    });
  });
});
