# VÉRONA — Order Management System & State Machine

## 1. Executive Summary

Phase 19 delivers the complete server-authoritative Order Management System and finite state machine for VÉRONA. It establishes the bridge between cryptographically verified payment capture (Phase 18) and downstream fulfillment, guaranteeing that customer orders are formulated strictly from verified payments, stored as immutable snapshots, guarded against IDOR vulnerabilities, and transitioned through an enforceable state machine.

### Strict Phase Boundaries

| Phase | Domain Responsibility | Bound In Phase 19? |
|---|---|---|
| **Phase 18** | Payment Gateway & Signature Verification | Consumed as authoritative prerequisite |
| **Phase 19** | **Order Formulation, Snapshots, State Machine, Account & Admin Views** | **ACTIVE OWNER** |
| **Phase 20** | Inventory Deduction, Stock Reservation & Warehouse Allocation | **STRICT BOUNDARY (Not Implemented)** |
| **Phase 21** | Fulfillment Assignment, Packing Slips & Courier Dispatch | **STRICT BOUNDARY (Not Implemented)** |
| **Phase 22** | Returns & Exchanges Workflows | **STRICT BOUNDARY (Not Implemented)** |
| **Phase 23** | Refund Computation & Gateway Refund Processing | **STRICT BOUNDARY (Not Implemented)** |

---

## 2. Order Architecture & Ingestion Flow

Orders in VÉRONA are **never** created directly by browser requests or unverified webhook events. An order can only be materialized from a server-verified `CAPTURED` payment.

```
       Phase 18 Payment Capture (CAPTURED)
                       ↓
         POST /api/orders (Client or Webhook)
                       ↓
     OrderService.createOrderFromPayment(customerId, input)
                       ↓
         [1] Payment Idempotency Check (Existing order?)
             ├── YES ──> Return existing OrderDTO safely
             └── NO
                       ↓
         [2] Validate Customer Ownership (payment.customerId === session.customer._id)
                       ↓
         [3] Validate Payment Status === CAPTURED
                       ↓
         [4] Load Checkout Session & Validate Customer Match
                       ↓
         [5] Verify Monetary Integrity (payment.amount === checkout.amountDueBeforePaymentMinor)
                       ↓
         [6] Load Active Cart & Cart Items (ensure cart is non-empty)
                       ↓
         [7] Generate Immutable Snapshots:
             ├── Item Snapshots (Name, Brand, SKU, Color, Size, Image, Prices)
             ├── Pricing Snapshot (Subtotal, Promotions, Coupon Discount, Tax, Total)
             ├── Delivery Address Snapshot (Full Name, Street, City, State, PIN)
             ├── Coupon Snapshot (Code, Discount Amount, Coupon ID)
             └── Payment Reference Snapshot (Provider, Gateway IDs, Currency, Amount)
                       ↓
         [8] Generate Human-Readable Order Number (VRN-YYYY-XXXXXX)
                       ↓
         [9] Persist Order (Status: CONFIRMED) & Record Status History Audit
                       ↓
        [10] Post-Creation Transitions:
             ├── Link orderId to Payment Record
             ├── Mark CheckoutSession status: COMPLETED
             └── Mark Cart status: CONVERTED (Clears active cart without data loss)
                       ↓
        [11] Emit Domain Event: order.created
                       ↓
        [12] Return Authoritative OrderDTO
```

---

## 3. Order Numbering Specification

Customer-facing order numbers are generated server-side using cryptographically secure random entropy to prevent sequential enumeration, competitor scraping, or guessable URLs:

* **Format**: `VRN-${YYYY}-${XXXXXX}`
* **Example**: `VRN-2026-F48B12`
* **Characteristics**:
  * Human-readable on customer invoices and support communications.
  * 16.7+ million distinct codes per year.
  * Validated against MongoDB unique index (`orderNumber: 1`).

---

## 4. Immutable Data Snapshots

Historical orders must never reflect subsequent mutations to the live product catalog, customer default addresses, or coupon rules.

### A. Garment Item Snapshots (`items`)
Captures the physical garment attributes at the precise moment of purchase:
* `productId` & `variantId` (historical links)
* `sku` (e.g. `VRN-GL-01-M`)
* `productName` (e.g. `Silk Evening Gown`)
* `brandName` (`VÉRONA Atelier`)
* `size` & `color`
* `image` (Primary garment snapshot)
* `quantity`, `unitPrice`, `discount`, `finalPrice` (in integer paise)

### B. Pricing Snapshot (`pricing`)
All monetary values are stored in integer minor units (paise for INR):
* `subtotal`
* `discount` (Promotions)
* `couponDiscount` (Coupon deduction)
* `totalDiscount`
* `shipping` (Complimentary or standard)
* `tax` (GST inclusive)
* `total`
* `currency` (`INR`)

### C. Delivery Address Snapshot (`shippingAddress`)
Preserves the exact recipient, address lines, landmark, city, state, and postal code. If the customer updates or deletes their saved addresses in `/account/addresses`, existing orders remain intact.

### D. Coupon & Payment Snapshots
* `coupon`: `{ code, discountMinor, couponId }`
* `paymentDetails`: `{ provider, providerOrderId, providerPaymentId, currency, paidAmountMinor }`

---

## 5. Centralized Order State Machine

The order lifecycle is governed by a deterministic finite state machine implemented in `modules/orders/state-machine/order-state-machine.ts`.

### Transition Matrix

| From Status | Permitted Target Statuses | Authorized Roles |
|---|---|---|
| `CONFIRMED` | `PROCESSING`, `CANCELLED` | Customer (Self-Cancel), Staff (`orders.update`) |
| `PROCESSING` | `PACKED`, `CANCELLED` | Staff (`orders.update`, `orders.manage`) |
| `PACKED` | `SHIPPED`, `CANCELLED` | Warehouse Staff (`orders.ship`), Staff |
| `SHIPPED` | `OUT_FOR_DELIVERY`, `DELIVERED` | Fulfillment / Logistics Staff |
| `OUT_FOR_DELIVERY`| `DELIVERED` | Delivery Partner / Staff |
| `DELIVERED` | `RETURN_REQUESTED` (Phase 22) | Customer |
| `CANCELLED` | *(Terminal State — No transitions permitted)* | None |
| `PAYMENT_FAILED` | *(Terminal State — No transitions permitted)* | None |

### Customer Self-Service Cancellation Rules
Customers may cancel orders exclusively when the order is in `CONFIRMED` status (`canCustomerCancelOrder(order) === true`). Once tailoring and atelier preparation begins (`PROCESSING`), customer self-cancellation is locked to prevent inventory confusion.

Structured cancellation reasons:
* `CUSTOMER_CHANGED_MIND`
* `ORDERED_WRONG_SIZE`
* `ORDERED_WRONG_PRODUCT`
* `FOUND_BETTER_PRICE`
* `DELIVERY_TIME_TOO_LONG`
* `OTHER`

---

## 6. Security & Anti-IDOR Enforcement

1. **Anti-IDOR on Order Detail**:
   `GET /api/orders/:orderNumber` validates `order.customerId.toString() === customer._id.toString()`. Requests for orders belonging to another client yield a generic `404 RESOURCE_NOT_FOUND` to prevent existence probing.
2. **Anti-Tampering on Amounts**:
   Order creation asserts `payment.amount === checkout.pricingSnapshot.amountDueBeforePaymentMinor`. Any discrepancy halts execution with `PAYMENT_AMOUNT_MISMATCH`.
3. **Database-Level Idempotency**:
   `OrderSchema.index({ paymentId: 1 }, { unique: true, sparse: true })` ensures that no duplicate order can be created for the same payment under any concurrency condition.
4. **RBAC Isolation**:
   Admin order viewing and transitions require `orders.read` and `orders.update` permissions via Phase 5 RBAC. Staff members cannot access arbitrary administrative endpoints.

---

## 7. Reconciliation Foundation

The order module provides administrative reconciliation tools to detect edge cases such as network dropouts between payment capture and order creation:

* **Captured Payments Without Orders**:
  `orderService.runReconciliationScan()` queries for `PaymentStatus.CAPTURED` records where no associated `Order` document exists.
* **Payment/Order Monetary Mismatches**:
  Scans all orders referencing payments where `order.pricing.total !== payment.amount`.

Administrative endpoint: `GET /api/admin/orders/reconciliation`

---

## 8. Customer & Admin User Experiences

* **Customer Checkout Confirmation**:
  Upon payment capture, the checkout screen dynamically confirms order formulation, displaying the order number, total paid, destination, and direct navigation links.
* **Customer Order History (`/account/orders`)**:
  Lists all past orders with status badges, garment thumbnails, order totals, and dates. Supports pagination and responsive card layouts.
* **Customer Order Detail (`/account/orders/[orderNumber]`)**:
  Full breakdown including visual status timeline, item specifications, address snapshots, financial audit, and cancellation dialog.
* **Admin Order Dashboard (`/admin/orders`)**:
  Staff portal for filtering orders by status, searching across order numbers/emails/phones, inspecting complete audit trails, triggering legal state transitions, and running reconciliation scans.
