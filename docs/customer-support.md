# VÉRONA — Customer Support System Architecture (Phase 26)

## 1. Executive Summary

Phase 26 implements the production-ready **Customer Support System** for VÉRONA. It establishes an authoritative communication and orchestration layer between discerning luxury clientele and the atelier's customer care specialists.

The support module orchestrates ticket lifecycles, structured multi-turn conversations, confidential staff internal notes, service level agreement (SLA) calculations, and verified domain context linking without duplicating or mutating foreign business logic.

---

## 2. Architectural Boundaries & Domain Ownership

Customer Support is an **orchestration and communication layer**, strictly honoring existing domain service boundaries:

| Domain | Phase | Authority & Responsibilities | Support Interaction |
|---|---|---|---|
| **Orders** | Phase 19 | Order lifecycle, pricing calculations, item states, cancellations | Read-only context linking; customer ownership verified |
| **Fulfillment & Shipping** | Phase 21 | Shipments, packages, waybills, carrier events | Read-only shipment tracking preview |
| **Returns & Exchanges** | Phase 22 | Return requests, inspection, exchange fulfillment | Read-only return status preview |
| **Refunds** | Phase 23 | Financial ledger, payment provider refund transactions | Read-only refund status & amount preview |
| **Reviews & Ratings** | Phase 24 | Verified purchase moderation, customer feedback | Cross-referenced for product sentiment |
| **Notifications & Comms** | Phase 25 | Authoritative delivery (Email, SMS, Push, In-App) | Consumes support domain events (`support.*`) |
| **Customer Support** | **Phase 26** | **Tickets, conversations, staff assignment, queues, SLA, internal notes** | **Authoritative orchestrator** |

Support never executes financial refunds, modifies order states, creates shipments, or delivers notification emails/SMS directly.

---

## 3. Support Data Model & Schemas

### 3.1 Support Ticket (`SupportTicket`)
Stored in the MongoDB collection `supporttickets`:
- `ticketNumber`: Immutable, customer-safe reference in format `SUP-YYYY-XXXXXX` (e.g., `SUP-2026-F9A1B2`).
- `customerId`: ObjectId referencing `Customer`. Strictly enforced across all customer operations.
- `subject`: Sanitized plain text, 5–200 characters.
- `category`: Centralized enum (`ORDER`, `PAYMENT`, `DELIVERY`, `RETURN`, `REFUND`, `PRODUCT`, `ACCOUNT`, `TECHNICAL`, `OTHER`).
- `priority`: Server-validated enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- `status`: State machine status (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `CLOSED`, `REOPENED`).
- `assignedTo`: Staff member ObjectId or null (Unassigned).
- `assignedTeam`: Support team tag.
- `orderId`, `shipmentId`, `returnRequestId`, `refundId`, `productId`: Optional context links verified against customer ownership.
- `slaFirstResponseDeadline`: Date timestamp calculated based on priority.
- `slaResolutionDeadline`: Date timestamp calculated based on priority.
- `firstResponseAt`: Timestamp stamped on first staff response (never stamped by system or customer messages).
- `resolvedAt`, `closedAt`, `reopenedAt`: Timestamps tracking resolution lifecycle.
- `lastMessageAt`: Timestamp of the latest message in the conversation.

### 3.2 Support Message (`SupportMessage`)
Stored in the MongoDB collection `supportmessages`:
- `ticketId`: ObjectId referencing `SupportTicket`.
- `senderType`: Centralized enum (`CUSTOMER`, `SUPPORT_AGENT`, `STAFF`, `ADMIN`, `SYSTEM`).
- `senderId`: Authenticated user ID (Customer ID or Staff ID).
- `senderDisplayName`: Customer name or staff concierge title.
- `messageType`: `MESSAGE`, `INTERNAL_NOTE`, `SYSTEM_EVENT`.
- `body`: Sanitized message text (1–10,000 characters).
- `attachments`: Array of verified `ISupportAttachment` objects (`name`, `url`, `fileType`, `fileSize`, `uploadedAt`).
- `isInternal`: Boolean. When `true`, message is strictly hidden from client API queries.
- `idempotencyKey`: Optional unique key preventing duplicate message dispatch on network retries.

---

## 4. Ticket State Machine & Lifecycle

The ticket state machine enforces deterministic, authorized status transitions:

```text
                  ┌──────────────┐
                  │     OPEN     │
                  └──────┬───────┘
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
      ┌──────────────┐        ┌──────────────┐
      │ IN_PROGRESS  │◄──────►│WAITING_CLIENT│
      └──────┬───────┘        └──────────────┘
             │
             ▼
      ┌──────────────┐
      │   RESOLVED   │
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐        ┌──────────────┐
      │    CLOSED    ├───────►│   REOPENED   │
      └──────────────┘        └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ IN_PROGRESS  │
                              └──────────────┘
```

### Transition Invariants
- `OPEN -> IN_PROGRESS`: Triggered when an agent takes ownership or begins triage.
- `OPEN/IN_PROGRESS -> WAITING_FOR_CUSTOMER`: Triggered automatically when an agent replies to the client.
- `WAITING_FOR_CUSTOMER -> IN_PROGRESS`: Triggered automatically when the customer replies.
- `IN_PROGRESS -> RESOLVED`: Executed by support staff when resolution is provided.
- `RESOLVED -> CLOSED`: Executed automatically or manually after resolution confirmation.
- `RESOLVED/CLOSED -> REOPENED`: Customer or staff initiated within the **14-day reopening window**. After 14 days, tickets are permanently closed.
- Direct mutations bypassing legal transitions throw `ValidationError` (`SUPPORT_INVALID_STATUS_TRANSITION`).

---

## 5. Security & Anti-IDOR Protections

1. **Customer Scoping**: All customer queries filter strictly by `{ ticketNumber, customerId }`. Customers can never view, update, or post messages to tickets owned by another customer.
2. **Context Ownership Validation**: When a customer creates a ticket referencing an `orderId`, `shipmentId`, `returnRequestId`, or `refundId`, the server inspects the referenced domain model to verify `resource.customerId === authenticatedCustomerId`. Cross-customer linking attempts throw `ForbiddenError`.
3. **Internal Note Isolation**:
   - Internal notes are saved with `isInternal: true` and `messageType: INTERNAL_NOTE`.
   - Customer API queries in `supportRepository.getCustomerTicketByNumber` apply `{ isInternal: false }` at the database query level.
   - Public serializers never expose internal notes to the client portal.
4. **Attachment Security**:
   - File extensions: Strictly blocks `.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.ts`, `.html`, `.htm`, `.svg`, `.vbs`, `.scr`.
   - MIME whitelisting: Only `image/jpeg`, `image/png`, `image/webp`, and `application/pdf` are permitted.
   - Size limit: 10MB per file; maximum 5 files per message.
   - Transport encryption: Enforces `https://` prefix for all attachment URLs.
5. **No Customer PII Leakage**: Staff ticket previews only display customer name and email necessary for communication; passwords, tokens, and payment credentials are never exposed.

---

## 6. Service Level Agreements (SLA)

VÉRONA implements centralized, server-authoritative SLA tracking based on priority:

| Priority | First Response SLA | Resolution SLA | Description |
|---|---|---|---|
| **URGENT** | 2 Hours | 12 Hours | Express atelier response for delivery & order escalations |
| **HIGH** | 4 Hours | 24 Hours | Priority handling for active shipments and returns |
| **MEDIUM** | 12 Hours | 48 Hours | Standard customer inquiries and product advice |
| **LOW** | 24 Hours | 72 Hours | General feedback, tailoring inquiries, non-time-critical |

### SLA State Calculation
- **`ON_TRACK`**: Elapsed time is within 75% of the deadline, or deadline was met prior to expiry.
- **`AT_RISK`**: Response/resolution is pending and within 1 hour (response) or 4 hours (resolution) of breach.
- **`BREACHED`**: Response or resolution deadline exceeded without completion.
- Timestamps: `firstResponseAt` is only recorded on the first public agent response. System events and customer messages do not count.

---

## 7. Role-Based Access Control (RBAC)

Phase 26 integrates with Phase 5 RBAC without introducing redundant auth roles:

| Permission | Role Assignment | Capability |
|---|---|---|
| `support.read` | Support Agent, Admin, Super Admin | Access support queue and ticket conversations |
| `support.create` | Customer, Support Agent, Admin | Create support inquiries |
| `support.reply` | Customer, Support Agent, Admin | Reply to customer-visible threads |
| `support.internal_notes` | Support Agent, Admin, Super Admin | View and create confidential internal notes |
| `support.assign` / `reassign` | Support Agent, Admin, Super Admin | Assign tickets to staff members or team queues |
| `support.close` / `reopen` | Customer (policy limited), Staff | Close tickets or reopen within 14 days |
| `support.update` | Support Agent, Admin, Super Admin | Override priority and mutate state machine |
| `support.analytics.read` | Support Agent, Admin, Super Admin | View real-time queue KPIs and SLA stats |

---

## 8. Notification & Event Integration (Phase 25 Boundary)

The support module emits transactional domain events consumed by the Notification Service (Phase 25):

- `support.ticket_created`: Emitted upon new ticket submission.
- `support.agent_replied`: Emitted when concierge replies to customer.
- `support.customer_replied`: Emitted when customer sends follow-up.
- `support.ticket_assigned`: Emitted when a ticket is assigned to a staff agent.
- `support.ticket_resolved`: Emitted when a ticket is resolved.
- `support.ticket_closed`: Emitted on ticket closure.
- `support.ticket_reopened`: Emitted on ticket reopening.

Phase 25 owns email, SMS, push, and in-app delivery. Phase 26 does not contain vendor delivery logic.

---

## 9. API Specifications

### 9.1 Customer Endpoints
- `GET /api/account/support`: Paginated list of customer inquiries (`page`, `limit`, `status`, `category`).
- `POST /api/account/support`: Create a new inquiry with anti-IDOR context validation and rate limiting.
- `GET /api/account/support/:ticketNumber`: Detailed ticket conversation and safe context previews.
- `POST /api/account/support/:ticketNumber/messages`: Submit customer reply.
- `POST /api/account/support/:ticketNumber/close`: Customer-initiated ticket closure.
- `POST /api/account/support/:ticketNumber/reopen`: Reopen resolved/closed ticket within 14 days.

### 9.2 Staff / Admin Endpoints
- `GET /api/admin/support`: Queue search & filter with pagination (`queue`, `status`, `priority`, `slaState`, `search`).
- `GET /api/admin/support/stats`: Aggregated queue KPIs (open, unassigned, urgent, SLA breached).
- `GET /api/admin/support/:ticketNumber`: Full operational console with internal notes and customer context.
- `POST /api/admin/support/:ticketNumber/messages`: Send public concierge reply to client.
- `POST /api/admin/support/:ticketNumber/internal-notes`: Add confidential staff investigation note.
- `POST /api/admin/support/:ticketNumber/assign`: Assign or reassign ticket to agent or team.
- `POST /api/admin/support/:ticketNumber/status`: Transition ticket status via state machine.
- `POST /api/admin/support/:ticketNumber/priority`: Override ticket priority and recalculate SLA.

---

## 10. Audit Logging & Retention

Every ticket modification writes an immutable entry to `AuditLogModel` (Phase 3):
- Actor identification (`id`, `email`, `type`: `CUSTOMER` / `STAFF` / `SYSTEM`).
- Action descriptor (`SUPPORT_TICKET_CREATED`, `SUPPORT_AGENT_REPLIED`, `SUPPORT_INTERNAL_NOTE_ADDED`, `SUPPORT_TICKET_ASSIGNED`, `SUPPORT_TICKET_STATUS_CHANGED`, `SUPPORT_TICKET_PRIORITY_CHANGED`, `SUPPORT_TICKET_REOPENED`, `SUPPORT_TICKET_CLOSED_BY_CUSTOMER`).
- Entity and metadata tracking previous state, new state, and reason.
- Conversations are preserved permanently; soft-deletion and anonymization follow GDPR retention policies.
