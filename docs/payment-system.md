# VÉRONA — Payment System Architecture & Gateway Integration Specification

**Phase 18 — Payment System (Razorpay)**  
**Status**: Production Ready  
**Upstream Dependencies**: Phase 4 (Auth), Phase 5 (RBAC), Phase 14 (Cart), Phase 15 (Pricing & Coupons), Phase 16 (Address & Serviceability), Phase 17 (Checkout)  
**Downstream Consumer**: Phase 19 (Order Formulation & Lifecycle Management)

---

## 1. Strict Phase Boundaries & Non-Goals

Phase 18 owns the **authoritative server-side payment lifecycle, Razorpay gateway integration, cryptographic verification, and webhook idempotency**.

### What Phase 18 Owns:
- Common payment provider adapter abstraction (`IPaymentProvider`).
- Concrete Razorpay adapter (`RazorpayPaymentProvider`) with server-side credentials and REST API communication.
- Payment order initiation via `POST /api/payments/create` strictly derived from Phase 17's validated checkout context (zero client-submitted amounts).
- Multi-attempt payment tracking (`IPaymentAttempt`) preserving failed history.
- Dynamic client-side Razorpay Checkout modal launch with prefilled customer details.
- Cryptographic HMAC SHA-256 signature verification for client payment return callbacks (`POST /api/payments/verify`).
- Authoritative Razorpay Webhook ingestion (`POST /api/webhooks/razorpay`) with raw-payload signature validation and event idempotency (`provider + eventId`).
- Centralized payment state machine preventing illegal state transitions.
- Resilient retry flow allowing customers to re-attempt payments without losing their bag.
- Payment reconciliation foundation for `PENDING` and `UNKNOWN` states.
- Customer ownership and anti-IDOR validation across all payment APIs.

### Strict Phase Non-Goals (Explicitly Deferred):
- **NO Order Creation**: No orders or order state machine transitions are triggered in this phase.
- **NO Inventory Deduction or Reservation**: Cart items remain unreserved until Phase 19/20.
- **NO Warehouse Allocation or Fulfillment**: Courier logistics belong to Phase 21.
- **NO Refund Processing**: Refunds belong to Phase 23.
- **NO Storing Sensitive Payment Credentials**: Cards, CVVs, UPI PINs, and OTPs are never stored or handled by VÉRONA servers.

---

## 2. System Architecture & Component Interaction

```
                            Customer (Browser)
                                    │
                                    ▼
                             /checkout UI
                                    │
                       1. Initiate Payment Order
                                    │
                                    ▼
                        POST /api/payments/create
                                    │
                              PaymentService
                       (Verifies Checkout via Ph17)
                                    │
                                    ▼
                         IPaymentProvider Adapter
                                    │
                                    ▼
                         Razorpay Orders API
                        (https://api.razorpay.com)
                                    │
                       2. Return Public Config
                                    │
                                    ▼
                        Razorpay Checkout Modal
                          (Client JavaScript)
                                    │
                       3. Customer Completes Payment
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
4. Client Callback                                      4. Server Webhook
POST /api/payments/verify                            POST /api/webhooks/razorpay
        │                                                       │
  Crypto Verification                                     Raw HMAC SHA-256
        │                                                       │
        └───────────────────────────┬───────────────────────────┘
                                    ▼
                              PaymentService
                       (Idempotent CAPTURED State)
                                    │
                                    ▼
                         Phase 19 PaymentResult
                          (Handoff to Orders)
```

---

## 3. Provider Abstraction & Razorpay Adapter

All payment provider interactions are isolated behind the `IPaymentProvider` interface:

```ts
export interface IPaymentProvider {
  readonly providerName: string;
  getPublicKey(): string;
  createPaymentOrder(params: CreatePaymentOrderParams): Promise<ProviderOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  verifyWebhook(params: VerifyWebhookParams): Promise<VerifyWebhookResult>;
  fetchPayment(providerPaymentId: string): Promise<ProviderPaymentDetails>;
  fetchPaymentOrder(providerOrderId: string): Promise<ProviderOrderDetails>;
}
```

The concrete `RazorpayPaymentProvider` utilizes native Node.js `node:crypto` and standard `fetch` against the official Razorpay v1 REST API. This avoids legacy third-party SDK quirks in modern Next.js 15 environments while ensuring timing-safe signature evaluation.

---

## 4. Environment Variables & Secret Isolation

Credentials are strictly stored server-side. Only public keys are ever communicated to the client:

| Variable | Environment | Sensitivity | Description |
| :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | Server | Public Identifier | Razorpay Key ID used for Basic Auth |
| `RAZORPAY_KEY_SECRET` | Server | **Secret** | Used to generate order signatures |
| `RAZORPAY_WEBHOOK_SECRET`| Server | **Secret** | Used to authenticate incoming webhooks |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client | Public Identifier | Used by Razorpay modal on frontend |

---

## 5. Payment State Machine

Legal state transitions are validated by `assertValidPaymentTransition`:

```
                ┌──────────────┐
                │   CREATED    │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
         ┌─────►│   PENDING    │◄─────┐ (Retry Attempt)
         │      └──────┬───────┘      │
         │             │              │
         │      ┌──────┴──────┐       │
         │      ▼             ▼       │
      ┌───────────┐     ┌───────────┐ │
      │AUTHORIZED │     │  FAILED   ├─┘
      └─────┬─────┘     └───────────┘
            │
            ▼
      ┌───────────┐
      │ CAPTURED  │ ──► [Phase 19 Order Execution]
      └───────────┘
```

- Direct jumps such as `CREATED -> CAPTURED` or `FAILED -> CAPTURED` without provider authorization are explicitly rejected.
- Retries create a new `PaymentAttempt` and move the payment back to `PENDING`.

---

## 6. Authoritative Payment Initiation & Checkout Integration

When `POST /api/payments/create` is called:
1. `customerId` is resolved from the active session (`requireCustomer()`).
2. `checkoutService.validateCheckout(customerId, checkoutSessionId)` is called:
   - Verifies bag is not empty.
   - Re-runs live pricing recalculation.
   - Re-checks delivery destination and postal PIN code serviceability.
3. The authoritative total `amountDueBeforePaymentMinor` is converted into an integer minor unit (paise) and passed to Razorpay.
4. Client-submitted prices or amounts are disregarded.

---

## 7. Cryptographic Verification & Webhook Idempotency

### A. Client Callback Signature
When the Razorpay Checkout modal completes, it returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
The server computes:
```
expectedSignature = HMAC-SHA256(keySecret, `${order_id}|${payment_id}`)
```
Verification requires `crypto.timingSafeEqual(expected, received)`.

### B. Webhook Signature & Idempotency
Razorpay webhooks send `x-razorpay-signature` against the **raw unparsed payload body**:
```
expectedSignature = HMAC-SHA256(webhookSecret, rawBody)
```
The server checks `PaymentWebhookEventModel` for the composite key `{ provider: "razorpay", eventId }`.
- If already `PROCESSED`, the webhook is acknowledged immediately as `DUPLICATE` without re-executing state changes.
- Handled events: `payment.captured`, `order.paid`, `payment.failed`.

---

## 8. Payment Reconciliation & Failure Handling

If a customer's browser disconnects during checkout:
- The payment remains in `PENDING` or `UNKNOWN`.
- When `GET /api/payments/:id` is accessed, the server queries Razorpay's API (`fetchPaymentOrder`) in real-time.
- If the gateway confirms the order was paid, the internal state transitions to `CAPTURED` with audit trail source `RECONCILIATION`.
- If payment failed, the customer can click "Retry Payment" (`POST /api/payments/:id/retry`), which revalidates the bag and generates a fresh payment attempt under the existing payment.

---

## 9. API Specification

| Method | Endpoint | Description | Cache Policy |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create` | Initiates payment order from checkout session. | `private, no-store` |
| `POST` | `/api/payments/verify` | Verifies cryptographic signature from client. | `private, no-store` |
| `GET` | `/api/payments/:id` | Returns payment status with ownership check. | `private, no-store` |
| `POST` | `/api/payments/:id/retry` | Re-initiates failed payment with new attempt. | `private, no-store` |
| `POST` | `/api/webhooks/razorpay` | Ingests and processes gateway webhook events. | `no-store` |

---

## 10. Downstream Handoff: Phase 19 Order Formulation

Upon successful capture, `PaymentService` exposes the canonical `PaymentResult`:
```ts
export interface PaymentResult {
  paymentId: string;
  checkoutSessionId: string;
  customerId: string;
  status: PaymentStatus;
  amountMinor: MinorUnits;
  currency: string;
  provider: string;
  providerPaymentId?: string;
  providerOrderId?: string;
}
```
Phase 19 will consume this contract to trigger authoritative order generation and inventory consumption.
