# VÉRONA — Checkout Architecture & Orchestration Specification

**Phase 17 — Checkout Experience & Orchestration Layer**  
**Status**: Production Ready  
**Upstream Dependencies**: Phase 4 (Auth), Phase 5 (RBAC), Phase 9 (Catalog), Phase 12 (Variants), Phase 14 (Cart), Phase 15 (Pricing & Coupons), Phase 16 (Address & Serviceability)  
**Downstream Consumer**: Phase 18 (Payment Gateway Integration)

---

## 1. Strict Phase Boundaries & Non-Goals

Phase 17 owns the **authoritative checkout orchestration and pre-payment review flow**.

### What Phase 17 Owns:
- Dedicated customer checkout route (`/checkout`) with safe authentication redirects.
- Checkout session management with 30-minute sliding TTL and multi-tab/refresh resilience.
- Pre-checkout bag and item validation.
- Delivery destination address selection and address snapshot creation.
- Live postal code delivery serviceability verification.
- Authoritative cart pricing recalculation via `PricingService` (zero client-controlled totals).
- Coupon eligibility and limit revalidation.
- Detection and structured reporting of checkout issues (`PRICE_CHANGED`, `DELIVERY_NOT_SERVICEABLE`, etc.).
- Complete pre-payment review UI adhering to the VÉRONA luxury design system.
- Frozen, locked `PaymentReadyCheckout` handoff contract for Phase 18.

### Strict Phase Non-Goals (Explicitly Deferred):
- **NO Payment Gateway Integration**: Razorpay, Stripe, or payment intent creation are NOT executed in Phase 17.
- **NO Payment Processing or Authorization**: No cards, UPI IDs, or wallets are charged.
- **NO Order Creation**: No orders or order state machine transitions are triggered.
- **NO Inventory Reservation or Stock Deduction**: Cart items remain unreserved until payment execution in later phases.
- **NO Warehouse Allocation or Shipping Label Generation**: Courier partner dispatch belongs to Phase 21.
- **NO Returns or Refunds**: Handled in post-purchase phases.

---

## 2. System Architecture & Orchestration Flow

The checkout layer implements a modular-monolith orchestration architecture:

```
                            Customer (Browser)
                                    │
                                    ▼
                             /checkout UI
                                    │
                         Checkout API Endpoints
                      (/api/checkout/* - Next.js)
                                    │
                         CheckoutService (Domain)
             ┌──────────────────────┼──────────────────────┐
             ▼                      ▼                      ▼
        CartService           PricingService         AddressService
        (Items, Bag)      (Live Pricing & Coupons)    (Customer Addr)
             │                      │                      │
             │                      │                      ▼
             │                      │             DeliveryServiceability
             │                      │               (Postal Pin Rules)
             └──────────────────────┼──────────────────────┘
                                    ▼
                         CheckoutSession Model
                         (Mongoose - MongoDB)
                                    │
                                    ▼
                         PaymentReadyCheckout
                          (Contract for Ph18)
```

The `CheckoutService` acts as the single authoritative coordinator. Domain rules, pricing totals, and address eligibility are never calculated inside React components.

---

## 3. Checkout Entry Requirements & Route Protection

The `/checkout` route enforces strict preconditions before rendering:

1. **Authenticated Customer Identity**:
   - Guests attempting to access `/checkout` are redirected to `/login?returnUrl=/checkout`.
   - The `returnUrl` is sanitized via `sanitizeReturnUrl` (`lib/url.ts`) to prevent open-redirect exploits.
2. **Active Bag Invariant**:
   - Customers with empty shopping bags are redirected directly to `/cart`.
   - Empty checkout sessions are rejected by `CheckoutService.initializeCheckout`.

---

## 4. Checkout Session Strategy & Lifecycle

Checkout sessions are persisted in MongoDB (`checkout_sessions` collection) with a **30-minute sliding TTL**:

```ts
interface ICheckoutSession {
  customerId: Types.ObjectId;
  cartId: Types.ObjectId;
  selectedAddressId?: Types.ObjectId;
  status: "ACTIVE" | "EXPIRED" | "INVALID" | "COMPLETED" | "CANCELLED";
  addressSnapshot?: ICheckoutAddressSnapshot;
  serviceabilitySnapshot?: ICheckoutServiceabilitySnapshot;
  pricingSnapshot: ICheckoutPricingSnapshot;
  appliedCouponCode?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Lifecycle States:
- **`ACTIVE`**: Normal operational state. Customer can switch addresses, review items, and proceed.
- **`EXPIRED`**: The 30-minute TTL has elapsed. The customer can safely refresh to regenerate live pricing without losing their cart.
- **`INVALID`**: An item has become unavailable or bag has been emptied in another tab.
- **`COMPLETED`**: Reserved for Phase 18/19 after order placement and successful payment.
- **`CANCELLED`**: Session explicitly abandoned.

### Multi-Tab & Refresh Resilience:
When a customer has Checkout open in Tab A and modifies their bag or applies a coupon in Tab B:
- `CheckoutService.getCheckout` re-reads the active cart and re-invokes `PricingService.calculateCartPricing`.
- If item prices or quantities changed, the session dynamically records `PRICE_CHANGED` and requires customer review before continuing.

---

## 5. Security & Anti-IDOR Protections

1. **Server-Derived Identity**:
   - `customerId` is strictly resolved via `requireCustomer()` (`lib/auth/session.ts`) from the authenticated session.
   - Any client-submitted `customerId`, `cartId`, or `amount` in JSON request bodies is disregarded and discarded.
2. **Ownership Assertion**:
   - `checkoutService.getCheckout(customerId, sessionId)` verifies that `session.customerId === customerId`.
   - Attempts to access or mutate another customer's session throw `AuthorizationError` (`CHECKOUT_NOT_OWNED`).
   - `checkoutService.selectAddress(customerId, sessionId, addressId)` verifies that the selected address belongs to the customer via `addressService.getAddress(customerId, addressId)`.
3. **Zero Client-Controlled Totals**:
   - The browser never submits `subtotal`, `grandTotal`, or `discount`.
   - All minor units (`paise`) are calculated server-side.

---

## 6. Checkout Validation & Issue Taxonomy

The pre-payment validation pipeline (`POST /api/checkout/:id/validate`) evaluates:

| Issue Code | Description | Recoverable |
| :--- | :--- | :--- |
| `CART_EMPTY` | Bag contains no items. | No (redirect to /cart) |
| `PRODUCT_UNAVAILABLE` | An item in the bag is out of stock. | Yes (remove item in /cart) |
| `VARIANT_UNAVAILABLE` | Selected size/color is no longer available. | Yes (switch variant in /cart) |
| `INVALID_QUANTITY` | Quantity exceeds stock or limits. | Yes (adjust quantity) |
| `PRICE_CHANGED` | Catalog price updated since cart addition. | Yes (review new total) |
| `COUPON_INVALID` | Applied coupon conditions no longer met. | Yes (remove or change code) |
| `COUPON_EXPIRED` | Coupon expiry date passed. | Yes (remove coupon) |
| `ADDRESS_REQUIRED` | No destination address selected. | Yes (select saved address) |
| `ADDRESS_INVALID` | Address fields missing or malformed. | Yes (edit address) |
| `DELIVERY_NOT_SERVICEABLE` | Postal PIN code not in courier service zone. | Yes (select alternate address) |
| `SERVICEABILITY_UNAVAILABLE`| Courier API or pincode engine unreachable. | Yes (retry validation) |
| `CHECKOUT_EXPIRED` | Session 30-minute TTL expired. | Yes (refresh checkout) |

---

## 7. Delivery Address & Serviceability Snapshots

To prevent orders from depending on mutable customer addresses:
- When an address is selected, `CheckoutService` extracts an immutable `CheckoutAddressSnapshot` (`fullName`, `phone`, `addressLine1`, `city`, `state`, `postalCode`, `country`).
- `deliveryServiceabilityService.checkServiceability` is evaluated immediately for the selected PIN code, recording `estimatedDeliveryDays` and serviceability status.

---

## 8. Phase 18 Payment-Ready Contract

When all validation checks pass, `POST /api/checkout/:id/payment-ready` locks and returns:

```ts
export interface PaymentReadyCheckout {
  checkoutSessionId: string;
  customerId: string;
  cartId: string;
  currency: string;             // "INR"
  amountMinor: number;          // Authoritative amount in paise (integer)
  pricingVersion: string;       // Timestamped deterministic version (e.g. "v_1727419200000")
  addressSnapshot: CheckoutAddressSnapshot;
  serviceabilitySnapshot: CheckoutServiceabilitySnapshot;
  items: CheckoutItemDTO[];
  appliedCouponCode: string | null;
}
```

Phase 18 will consume this contract to initialize Razorpay payment orders.

---

## 9. API Specifications

| Method | Endpoint | Description | Cache Policy |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/checkout` | Returns active checkout session for customer. | `private, no-store` |
| `POST` | `/api/checkout` | Initializes or refreshes checkout session. | `private, no-store` |
| `GET` | `/api/checkout/:id` | Retrieves checkout session by ID with ownership check. | `private, no-store` |
| `PATCH`| `/api/checkout/:id/address` | Selects delivery address and revalidates serviceability. | `private, no-store` |
| `POST` | `/api/checkout/:id/validate` | Executes full validation pipeline. | `private, no-store` |
| `POST` | `/api/checkout/:id/payment-ready`| Locks and produces Phase 18 PaymentReadyCheckout contract.| `private, no-store` |
