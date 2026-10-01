# VÉRONA — Notifications & Communication Architecture (Phase 25)

## 1. System Overview

The **Notifications & Communication System** serves as the authoritative, event-driven communication layer for the VÉRONA luxury garments e-commerce platform. It provides deterministic, multi-channel dispatch across In-App, Email (via Resend REST API), SMS, and Web Push, with strict delivery attempt logging, exponential backoff retries, and durable idempotency.

### Strict Phase Boundary
The notification layer **never executes or mutates business logic**. It strictly listens to domain events produced by upstream modules:
- **Phase 18 (Payment)**: Communicates payment authorization outcomes (`payment.completed`, `payment.failed`).
- **Phase 19 (Orders)**: Communicates order state transitions (`order.confirmed`, `order.cancelled`).
- **Phase 21 (Fulfillment & Shipping)**: Communicates tracking and delivery milestones (`order.shipped`, `order.delivered`).
- **Phase 22 (Returns & Exchanges)**: Communicates return requests and inspection approvals/rejections (`return.approved`, `return.rejected`).
- **Phase 23 (Refunds)**: Communicates financial settlements (`refund.completed`, `refund.failed`).
- **Phase 24 (Reviews & Ratings)**: Communicates published customer feedback (`review.published`).
- **Phase 4 (Security)**: Communicates account activity and password adjustments (`account.security`).

### Failure Isolation Guarantee
Notification dispatch operates under an asynchronous, eventually consistent model. A communication failure (such as an email provider network timeout or an invalid phone number) **never causes an upstream transaction to fail or roll back**. Orders remain confirmed, payments remain captured, and refunds remain settled regardless of external provider availability.

---

## 2. Event-Driven Architecture & Pipeline

```
           Upstream Domain Event (e.g. order.confirmed)
                             │
                             ▼
              [Notification Orchestrator]
                             │
     ┌───────────────────────┴────────────────────────┐
     │                                                │
[Event Idempotency Check]                    [Recipient Resolution]
(Deduplicate via eventId)                    (DB Customer Lookup)
     │                                                │
     └───────────────────────┬────────────────────────┘
                             │
                             ▼
               [Preference & Policy Resolver]
             (Mandatory security invariants)
                             │
                             ▼
                  [Channel Router Service]
          (Filters channels based on preferences)
                             │
                             ▼
               [Template Registry & Renderer]
       (Escapes variables, generates HTML & text)
                             │
                             ▼
              [Notification Record Created]
              (MongoDB Notification Document)
                             │
                             ▼
               [Delivery Execution Service]
    ┌────────────────────────┼────────────────────────┐
    ▼                        ▼                        ▼
[In-App Channel]      [Email Channel]          [SMS & Push Channels]
(Immediate DB)        (Resend REST API)        (Carrier Abstraction)
    │                        │                        │
    └────────────────────────┬────────────────────────┘
                             │
                             ▼
             [Delivery Attempt Tracking & Retry]
            (NotificationDeliveryAttempt Records)
```

---

## 3. Event Catalog & Payload Contracts

Every notification event implements `BaseDomainEvent` requiring a cryptographically unique `eventId`, `eventType`, `customerId`, and `occurredAt`.

| Event Type | Priority | Category | Default Channels | Deep Link Target |
| :--- | :--- | :--- | :--- | :--- |
| `order.confirmed` | `HIGH` | `ORDERS` | `IN_APP`, `EMAIL` | `/account/orders/:orderNumber` |
| `order.shipped` | `HIGH` | `DELIVERY` | `IN_APP`, `EMAIL` | `/account/orders/:orderNumber/tracking` |
| `order.delivered` | `HIGH` | `DELIVERY` | `IN_APP`, `EMAIL` | `/account/orders/:orderNumber` |
| `order.cancelled` | `HIGH` | `ORDERS` | `IN_APP`, `EMAIL` | `/account/orders/:orderNumber` |
| `payment.completed` | `HIGH` | `PAYMENTS` | `IN_APP`, `EMAIL` | `/account/orders/:orderNumber` |
| `payment.failed` | `CRITICAL` | `PAYMENTS` | `IN_APP`, `EMAIL` | `/account/orders/:orderNumber` |
| `refund.completed` | `HIGH` | `RETURNS_REFUNDS`| `IN_APP`, `EMAIL` | `/account/refunds/:refundNumber` |
| `return.approved` | `HIGH` | `RETURNS_REFUNDS`| `IN_APP`, `EMAIL` | `/account/returns/:returnNumber` |
| `return.rejected` | `HIGH` | `RETURNS_REFUNDS`| `IN_APP`, `EMAIL` | `/account/returns/:returnNumber` |
| `review.published` | `NORMAL` | `REVIEWS` | `IN_APP`, `EMAIL` | `/product/:productId` |
| `account.security` | `CRITICAL` | `SECURITY` | `IN_APP`, `EMAIL` | `/account/settings` |

---

## 4. Multi-Channel Providers

### 1. In-App Channel (`IN_APP`)
- Backed directly by the primary `NotificationModel` collection in MongoDB.
- Immediately available to the customer upon dispatch.
- Supports unread badge aggregation and real-time polling.

### 2. Email Channel (`EMAIL`)
- Implemented via `ResendEmailProvider` using standard HTTPS POST requests to `https://api.resend.com/emails`.
- Includes custom timeout protection (10 seconds via `AbortController`).
- Forwards `Idempotency-Key: email_<notificationId>_<templateKey>` to prevent double charges and duplicate emails on network retransmission.
- In test environments or when `RESEND_API_KEY` is not present, safely falls back to a simulated dispatch with unique simulated message IDs (`resend_sim_...`).
- Persists audit records to `EmailEventModel`.

### 3. SMS & Push Channels (`SMS`, `PUSH`)
- Structured provider contracts (`INotificationChannelHandler`) with active contact verification.
- Simulated delivery fallback when external carrier credentials are unconfigured.

---

## 5. Luxury Brand Email Templates

Located in `modules/notifications/templates/`:
- **Visual Identity**: Tailored to VÉRONA's haute couture aesthetic (ivory `#F8F8F7`, obsidian `#0A0A0A`, warm gray accents, Didot/Bodoni serif headings, elegant margins, and responsive layouts).
- **Sanitization & Security**: All dynamic strings (customer names, order numbers, cancellation reasons) pass through `escapeHtml()` to neutralize potential XSS or HTML injection attacks.
- **Multipart Content**: Every email compiles both a rich HTML document and an accessible plain-text version.
- **Deterministic Versioning**: All templates output a version identifier (`v1.0.0`) recorded on the delivery attempt.

---

## 6. Communication Preferences & Security Invariants

Customers manage their notification settings at `/account/settings/notifications`.

### Mandatory vs. Optional Invariant
1. **Security & Authentication**:
   - `securityAlerts` is an **immutable setting** locked to `true`.
   - The server rejects any client attempt to disable security alerts (`PATCH /api/account/notification-preferences` throws `ValidationError`).
   - The Channel Router guarantees that events of category `SECURITY` or priority `CRITICAL` are dispatched via `IN_APP` and `EMAIL` even if other channels are disabled.
2. **Transactional Updates**:
   - Order, payment, shipping, and refund alerts default to `enabled`.
3. **Optional / Marketing Previews**:
   - Defaults to `disabled` (opt-in only).

---

## 7. Delivery Retries & Resilience

### Controlled Retries
- Failed channel delivery attempts enter `RETRY_PENDING` status if `attemptNumber < 3`.
- Next retry timestamp is calculated using exponential backoff:
  $$\text{Delay} = 2^{\text{attempt}} \times 30\text{ seconds}$$
- Attempts are capped at **3 total attempts**.

### Delivery Idempotency
- Every attempt possesses a unique compound idempotency key: `attempt_<notificationId>_<channel>_<attemptNumber>`.
- MongoDB unique index prevents duplicate concurrent worker executions.

### Staff Manual Retries
- Authorized staff with `NOTIFICATIONS_RETRY` or `NOTIFICATIONS_MANAGE` can trigger manual retries via `POST /api/admin/notifications/:id/retry`.
- Rejects retries if the notification was already delivered or if the maximum attempt limit has been reached.
- Every manual retry is logged to `AuditLogModel`.

---

## 8. Webhook Processing (Resend)

The webhook endpoint `POST /api/webhooks/resend`:
1. Validates Svix signature headers (`svix-id`, `svix-timestamp`, `svix-signature`).
2. Enforces replay protection (rejects requests older than 10 minutes).
3. Maps provider event types:
   - `email.delivered` $\rightarrow$ `DELIVERED`, updates `deliveredAt`.
   - `email.bounced` $\rightarrow$ `BOUNCED`, updates `failedAt` and records bounce reason.
   - `email.opened` $\rightarrow$ `OPENED`, updates `openedAt`.
4. Synchronizes state across `EmailEventModel` and `NotificationDeliveryAttemptModel`.

---

## 9. Endpoints & API Reference

### Customer Endpoints
- `GET /api/account/notifications`: Paginated in-app notification list (`?page=1&limit=20&unreadOnly=true`).
- `GET /api/account/notifications/unread-count`: Returns `{ unreadCount, totalCount }`.
- `POST /api/account/notifications/:id/read`: Marks notification read with strict customer ownership verification.
- `POST /api/account/notifications/read-all`: Marks all customer notifications read.
- `GET /api/account/notification-preferences`: Retrieves current preferences.
- `PATCH /api/account/notification-preferences`: Updates preference toggles (protects security invariant).

### Admin Endpoints
- `GET /api/admin/notifications`: Queries notifications across all customers with filters (`type`, `category`, `status`, `channel`, `search`, `page`, `limit`).
- `GET /api/admin/notifications/:id`: Retrieves single notification with full delivery attempts breakdown.
- `POST /api/admin/notifications/:id/retry`: Triggers manual retry for a specific failed attempt.
- `GET /api/admin/notifications/stats`: Real-time metrics on delivery attempts, unread counts, and channel breakdown.

### Webhook Endpoint
- `POST /api/webhooks/resend`: Ingests Resend delivery callbacks.

---

## 10. Database Schema & Compound Indexes

### `notifications` Collection
- `{ customerId: 1, createdAt: -1 }`: Optimizes customer notification center queries.
- `{ customerId: 1, readAt: 1 }`: Optimizes unread count badge calculation.
- `{ eventId: 1, customerId: 1 }`: Enforces event idempotency.
- `{ type: 1, createdAt: -1 }`: Supports administrative filtering.

### `notification_delivery_attempts` Collection
- `{ notificationId: 1, channel: 1 }`: Lookups for notification detail view.
- `{ status: 1, nextRetryAt: 1 }`: Worker queue polling for pending retries.
- `{ customerId: 1, createdAt: -1 }`: Customer communication audit.
- `{ idempotencyKey: 1 }` (unique): Prevents duplicate attempt dispatch.

### `email_events` Collection
- `{ recipientEmail: 1, createdAt: -1 }`: Recipient audit trail.
- `{ providerMessageId: 1 }`: Webhook correlation.
