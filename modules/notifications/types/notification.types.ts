/**
 * VÉRONA — Notifications & Communication Domain Types (Phase 25)
 *
 * Defines authoritative DTOs, delivery plans, preference contracts,
 * and delivery attempt records.
 */

import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationDeliveryStatus,
  NotificationStatus,
  EmailEventStatus,
} from "@/constants/status";

// ── Customer Safe DTOs ─────────────────────────────────────────────────────────

export interface NotificationPublicDTO {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  body?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationSummaryDTO {
  unreadCount: number;
  totalCount: number;
}

export interface NotificationPreferenceDTO {
  customerId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
  inApp: boolean;
  orderUpdates: boolean;
  paymentUpdates: boolean;
  shippingUpdates: boolean;
  returnRefundUpdates: boolean;
  reviewUpdates: boolean;
  securityAlerts: boolean; // Immutable (Mandatory)
  marketing: boolean;
  updatedAt?: string;
}

export interface UpdateNotificationPreferenceInput {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  whatsapp?: boolean;
  inApp?: boolean;
  orderUpdates?: boolean;
  paymentUpdates?: boolean;
  shippingUpdates?: boolean;
  returnRefundUpdates?: boolean;
  reviewUpdates?: boolean;
  marketing?: boolean;
}

// ── Admin DTOs ────────────────────────────────────────────────────────────────

export interface DeliveryAttemptDTO {
  id: string;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  attemptNumber: number;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  attemptedAt: string;
  completedAt?: string;
  nextRetryAt?: string;
}

export interface NotificationAdminDTO {
  id: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  type: NotificationType;
  title: string;
  message: string;
  body?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  eventId?: string;
  eventType?: string;
  actionUrl?: string;
  status: NotificationStatus;
  readAt?: string;
  createdAt: string;
  deliveryAttempts: DeliveryAttemptDTO[];
}

export interface NotificationQueryFilter {
  customerId?: string;
  status?: NotificationStatus;
  type?: NotificationType;
  category?: NotificationCategory;
  channel?: NotificationChannel;
  deliveryStatus?: NotificationDeliveryStatus;
  unreadOnly?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ── Delivery Orchestration & Router Types ─────────────────────────────────────

export interface RecipientInfo {
  customerId: string;
  email: string;
  phone?: string;
  name: string;
  displayName: string;
}

export interface DeliveryPlan {
  notificationId: string;
  eventId: string;
  recipient: RecipientInfo;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  templateKey: string;
  templateData: Record<string, unknown>;
  actionUrl?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  status: EmailEventStatus;
  error?: string;
}
