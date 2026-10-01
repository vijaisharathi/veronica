/**
 * VÉRONA — Customer Support Domain Types & DTOs (Phase 26)
 *
 * Defines strongly-typed DTOs, inputs, filters, and context representations
 * for customer self-service and staff support workflows.
 */

import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportCategory,
  SupportSenderType,
  SupportMessageType,
  SupportSlaState,
} from "@/constants/status";

// ── Attachment DTO ────────────────────────────────────────────────────────────

export interface SupportAttachmentDTO {
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
  uploadedAt?: string;
}

// ── Context Previews (Customer & Staff Safe) ──────────────────────────────────

export interface SupportOrderContext {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
}

export interface SupportShipmentContext {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
}

export interface SupportReturnContext {
  id: string;
  returnNumber: string;
  status: string;
  returnMethod: string;
  pickupScheduledDate?: string;
}

export interface SupportRefundContext {
  id: string;
  refundNumber: string;
  amountMinor: number;
  currency: string;
  status: string;
  sourceType: string;
}

export interface SupportProductContext {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  thumbnailUrl?: string;
}

export interface SupportTicketContextDTO {
  order?: SupportOrderContext;
  shipment?: SupportShipmentContext;
  returnRequest?: SupportReturnContext;
  refund?: SupportRefundContext;
  product?: SupportProductContext;
}

// ── SLA Representation ────────────────────────────────────────────────────────

export interface SupportSlaInfo {
  state: SupportSlaState;
  firstResponseDeadline?: string;
  resolutionDeadline?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  firstResponseState: SupportSlaState;
  resolutionState: SupportSlaState;
  isBreached: boolean;
}

// ── Customer DTOs ─────────────────────────────────────────────────────────────

export interface CustomerSupportMessageDTO {
  id: string;
  senderType: SupportSenderType;
  senderDisplayName: string;
  body: string;
  attachments: SupportAttachmentDTO[];
  createdAt: string;
}

export interface CustomerSupportTicketDTO {
  ticketNumber: string;
  subject: string;
  category: SupportCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  hasOrderContext: boolean;
  orderNumber?: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSupportTicketDetailDTO extends CustomerSupportTicketDTO {
  context: SupportTicketContextDTO;
  messages: CustomerSupportMessageDTO[];
  canReply: boolean;
  canClose: boolean;
  canReopen: boolean;
}

// ── Admin / Staff DTOs ────────────────────────────────────────────────────────

export interface AdminSupportMessageDTO {
  id: string;
  senderType: SupportSenderType;
  senderId: string;
  senderDisplayName: string;
  messageType: SupportMessageType;
  body: string;
  attachments: SupportAttachmentDTO[];
  isInternal: boolean;
  createdAt: string;
}

export interface AdminSupportTicketDTO {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  subject: string;
  category: SupportCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  assignedTeam?: string;
  orderNumber?: string;
  sla: SupportSlaInfo;
  unreadCount?: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupportTicketDetailDTO extends AdminSupportTicketDTO {
  context: SupportTicketContextDTO;
  messages: AdminSupportMessageDTO[];
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  reopenedAt?: string;
}

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface CreateTicketInput {
  category: SupportCategory;
  subject: string;
  message: string;
  priority?: SupportTicketPriority;
  orderId?: string;
  shipmentId?: string;
  returnRequestId?: string;
  refundId?: string;
  productId?: string;
  attachments?: SupportAttachmentDTO[];
  idempotencyKey?: string;
}

export interface CustomerReplyInput {
  message: string;
  attachments?: SupportAttachmentDTO[];
  idempotencyKey?: string;
}

export interface AgentReplyInput {
  message: string;
  attachments?: SupportAttachmentDTO[];
  idempotencyKey?: string;
}

export interface InternalNoteInput {
  note: string;
  attachments?: SupportAttachmentDTO[];
}

export interface AssignTicketInput {
  assignedTo?: string | null;
  assignedTeam?: string | null;
}

export interface UpdateStatusInput {
  status: SupportTicketStatus;
  reason?: string;
}

export interface UpdatePriorityInput {
  priority: SupportTicketPriority;
  reason?: string;
}

// ── Filter Queries ────────────────────────────────────────────────────────────

export interface SupportTicketFilter {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportCategory;
  assignedTo?: string; // staff ID or "UNASSIGNED"
  assignedTeam?: string;
  customerId?: string;
  orderId?: string;
  queue?: string;
  slaState?: SupportSlaState;
  slaBreachedOnly?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CustomerTicketFilter {
  status?: SupportTicketStatus;
  category?: SupportCategory;
  page?: number;
  limit?: number;
}

export interface AdminSupportStatsDTO {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingCustomerTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  unassignedTickets: number;
  urgentTickets: number;
  slaBreachedTickets: number;
}
