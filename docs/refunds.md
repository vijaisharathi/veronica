# VÉRONA — Refund Management System Architecture

## Overview
The **Refund Management System (Phase 23)** serves as the authoritative operational layer for all post-order financial settlements, return credits, and payment gateway reversals. It enforces strict monetary invariants, full/partial calculations from immutable historical order snapshots, idempotency, webhook deduplication, and automated gateway reconciliation.

---

## 1. Strict Phase Boundaries & Integration

| Phase | Domain Ownership | Responsibilities |
| :--- | :--- | :--- |
| **Phase 18** | **Payment System** | Payments, payment attempts, gateway authorization, capture, signature verification. |
| **Phase 19** | **Order Management** | Order state machine, order cancellation events, immutable order pricing snapshots. |
| **Phase 20** | **Inventory Management**| Stock reservations, warehouse allocations, returns restocking. |
| **Phase 21** | **Fulfillment & Shipping**| Outbound packages, courier shipments, delivery tracking. |
| **Phase 22** | **Returns & Exchanges** | Return eligibility, pickup logistics, QC inspection, settlement readiness. |
| **Phase 23** | **Refund Management** | **Authoritative refund calculations, eligibility, provider dispatch, reconciliation.** |
| **Phase 25** | **Notifications** | Emits refund events (`refund.requested`, `refund.completed`, `refund.failed`). |

> **Strict Non-Interference Rule:**
> - Phase 23 does **NOT** approve returns, inspect garments, restock inventory, or manage couriers.
> - When a return is inspected and marked `APPROVED_FOR_SETTLEMENT` in Phase 22, it hands off to Phase 23 to calculate and execute the financial refund.

---

## 2. Core Architectural Flow

```
Return Settlement (Phase 22) / Cancellation (Phase 19) / Admin Adjustment
                              ↓
                   Refund Eligibility Service
                              ↓
                  Refund Calculation Engine
                              ↓
                    Refund State Machine
                              ↓
               Payment Provider Adapter (Razorpay)
                              ↓
                  Authoritative Refund Record
```

---

## 3. Financial Invariants & Money Representation

1. **Integer Minor Units:** All internal monetary values are strictly represented in integer minor units (INR paise, e.g. ₹1,999.50 = `199950`). Floating-point arithmetic is strictly prohibited.
2. **Cumulative Ceiling Rule:**
   $$\sum \text{SuccessfulRefunds} \le \text{CapturedAmount}$$
   A captured payment of ₹10,000 can support multiple partial refunds (e.g. ₹2,500 + ₹3,500 + ₹4,000 = ₹10,000). Any subsequent refund of even ₹1 is rejected server-side.
3. **Currency Invariant:** Refund currency must match original captured payment currency (`INR`).
4. **Non-Negative Balances:** All calculations assert amounts $> 0$.

---

## 4. Refund Calculation & Immutable Snapshots

Refund calculation strictly consumes the original financial snapshots from Phase 19:
- **Historical Order Pricing Snapshot:** Uses `order.pricing` (subtotal, discounts, coupons, shipping, tax).
- **Proportional Unit Allocation:**
  $$\text{UnitRefundable} = \lfloor \frac{\text{ItemFinalPrice} \times \text{RefundQuantity}}{\text{OrderedQuantity}} \rfloor$$
  Item-level discounts and coupons are preserved accurately; historical coupons are never re-evaluated at current rates.
- **Shipping Refund Policy:**
  - **Order Cancellation:** Shipping is refundable (`REFUND_SHIPPING_ON_CANCELLATION: true`).
  - **Return After Delivery:** Shipping is non-refundable by default (`REFUND_SHIPPING_ON_RETURN: false`).

---

## 5. Refund State Machine

```
      REQUESTED
          ↓
       ELIGIBLE
          ↓
      INITIATED
       ↙     ↘
PROCESSING    COMPLETED
   ↓   ↘
FAILED  RECONCILIATION_REQUIRED
   ↓           ↓
RETRY_PENDING  COMPLETED / FAILED
   ↓
INITIATED
```

- **Terminal State:** `COMPLETED` is an absolute terminal state; no transitions away from `COMPLETED` are permitted.
- **Gateway Timeouts:** If a network timeout occurs during gateway dispatch, the system transitions to `RECONCILIATION_REQUIRED` and does **not** blindly retry.

---

## 6. Payment Provider Adapter & Gateway Idempotency

- Extends Phase 18 `IPaymentProvider` with `createRefund(params)` and `getRefund(providerRefundId)`.
- Unique Idempotency Keys (`REF-IDEMP-${refundNumber}-${timestamp}`) are dispatched to Razorpay.
- Double-submission protection: Duplicate calls for an in-flight or completed refund return the existing record without secondary provider calls.

---

## 7. Webhook Processing & Deduplication

- Reuses Phase 18 cryptographic HMAC SHA-256 signature verification.
- Incoming events (`refund.processed`, `refund.failed`) are deduplicated against stored event IDs.
- Transitions internal refund status to `COMPLETED` or `FAILED` and records `processedAt`.

---

## 8. Gateway Reconciliation

`RefundReconciliationService` resolves unknown or ambiguous gateway states:
- Actively queries gateway via `GET /refunds/:providerRefundId`.
- Resolves `RECONCILIATION_REQUIRED` or `PROCESSING` into `COMPLETED` or `FAILED`.
- **Mismatch Detection:** If internal state was `FAILED` but the gateway reports `COMPLETED`, flags `mismatchDetected: true`, logs a high-severity audit record, and updates local state safely.

---

## 9. Security & Access Control (RBAC)

### Customer Anti-IDOR
- All customer endpoints (`/api/account/refunds`, `/api/account/refunds/[refundNumber]`) verify authenticated customer ownership. Customers cannot access another customer's refund records.
- Internal database IDs, provider credentials, and staff comments are never exposed in customer DTOs.

### Staff RBAC Permissions
- `refunds.read`: Read-only access to admin refund queue.
- `refunds.request`: Can request return or cancellation refunds.
- `refunds.initiate`: Can authorize provider refund dispatch.
- `refunds.retry`: Can retry confirmed failed refunds.
- `refunds.reconcile`: Can trigger manual gateway reconciliation.
- `refunds.manage`: Super-admin operational access.

---

## 10. Audit Logging
Every refund action creates an immutable record in `AuditLogModel`:
- `actorId` & `actorType` (`STAFF`, `CUSTOMER`, `SYSTEM`, `WEBHOOK`)
- `action` (`REFUND_REQUESTED`, `REFUND_COMPLETED`, `REFUND_FAILED`, `REFUND_RETRY_REQUESTED`, `REFUND_RECONCILED`)
- `entityId` & `metadata` (refundNumber, amount, provider references)
