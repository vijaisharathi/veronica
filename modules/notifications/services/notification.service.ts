/**
 * VÉRONA — Notification Service Facade (Phase 25)
 *
 * Central operational facade providing secure application layer methods for:
 * 1. Domain Event Ingestion & Notification Orchestration
 * 2. Customer Notification Center Operations (with anti-IDOR checks)
 * 3. Customer Preference Management (enforcing security invariants)
 * 4. Admin Monitoring, Delivery Attempt Inspection, and Manual Retries
 * 5. Comprehensive Audit Logging for Admin Mutations
 */

import {
  NotificationPublicDTO,
  NotificationAdminDTO,
  NotificationSummaryDTO,
  NotificationPreferenceDTO,
  UpdateNotificationPreferenceInput,
  NotificationQueryFilter,
} from "../types/notification.types";
import { VeronaDomainEvent } from "../events/event-catalog";
import { notificationOrchestrator, OrchestrationResult } from "../orchestrator/notification-orchestrator";
import { notificationRepository, PaginatedResult } from "../repositories/notification.repository";
import { notificationPreferenceService } from "../preferences/notification-preference.service";
import { notificationDeliveryService } from "../delivery/notification-delivery.service";
import { AuditLogModel } from "@/db/models";
import { logger } from "@/lib/logger";

export class NotificationService {
  // ── Event Ingestion ──────────────────────────────────────────────────────────

  /**
   * Authoritative entry point for domain events emitted by upstream business modules.
   */
  async handleDomainEvent(event: VeronaDomainEvent): Promise<OrchestrationResult> {
    logger.info(`Received domain event: ${event.eventType}`, {
      context: "NotificationService",
      metadata: { eventId: event.eventId, customerId: event.customerId },
    });
    return notificationOrchestrator.processEvent(event);
  }

  // ── Customer Operations ──────────────────────────────────────────────────────

  /**
   * Lists customer notifications with pagination.
   */
  async getCustomerNotifications(
    customerId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<PaginatedResult<NotificationPublicDTO>> {
    return notificationRepository.listForCustomer(customerId, options);
  }

  /**
   * Retrieves summary (unread and total count) for customer notification badge.
   */
  async getCustomerSummary(customerId: string): Promise<NotificationSummaryDTO> {
    return notificationRepository.getSummaryForCustomer(customerId);
  }

  /**
   * Marks a specific notification as read, guaranteeing customer ownership.
   */
  async markNotificationRead(
    notificationId: string,
    customerId: string
  ): Promise<{ success: boolean; found: boolean }> {
    return notificationRepository.markAsRead(notificationId, customerId);
  }

  /**
   * Marks all notifications as read for a customer.
   */
  async markAllNotificationsRead(customerId: string): Promise<{ modifiedCount: number }> {
    return notificationRepository.markAllAsRead(customerId);
  }

  /**
   * Retrieves current customer communication preferences.
   */
  async getPreferences(customerId: string): Promise<NotificationPreferenceDTO> {
    return notificationPreferenceService.getPreferences(customerId);
  }

  /**
   * Updates customer communication preferences, protecting security alerts invariant.
   */
  async updatePreferences(
    customerId: string,
    updates: UpdateNotificationPreferenceInput
  ): Promise<NotificationPreferenceDTO> {
    return notificationPreferenceService.updatePreferences(customerId, updates);
  }

  // ── Admin Operations ─────────────────────────────────────────────────────────

  /**
   * Queries notifications across all customers with filtering and delivery attempt details.
   */
  async getAdminNotifications(
    filter: NotificationQueryFilter
  ): Promise<PaginatedResult<NotificationAdminDTO>> {
    return notificationRepository.listForAdmin(filter);
  }

  /**
   * Retrieves a single notification with complete delivery audit trail.
   */
  async getAdminNotificationById(notificationId: string): Promise<NotificationAdminDTO | null> {
    return notificationRepository.getByIdForAdmin(notificationId);
  }

  /**
   * Manually retries a failed delivery attempt with authorization checks and audit logging.
   */
  async retryDeliveryAttempt(
    attemptId: string,
    actor: { id: string; email?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const outcome = await notificationDeliveryService.retryDeliveryAttempt(attemptId, actor);

    // Audit log staff retry action
    await AuditLogModel.create({
      actor: {
        id: actor.id,
        email: actor.email,
        type: "STAFF",
      },
      action: "NOTIFICATION_DELIVERY_RETRY",
      entity: "NotificationDeliveryAttempt",
      entityId: attemptId,
      metadata: {
        success: outcome.success,
        error: outcome.error,
        result: outcome.result,
      },
    }).catch((err) => {
      logger.warn("Failed to write audit log for delivery retry", {
        context: "NotificationService",
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return outcome;
  }

  /**
   * Fetches real-time delivery statistics for admin dashboard.
   */
  async getDeliveryStats() {
    return notificationRepository.getDeliveryStats();
  }
}

export const notificationService = new NotificationService();
