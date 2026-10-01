# VÉRONA — Address & Delivery Serviceability System (Phase 16)

## 1. Executive Summary & Architectural Scope

Phase 16 establishes the production-grade **Customer Address Management** and **Delivery Serviceability Verification Engine** for **VÉRONA**.

This system allows customers to manage multiple delivery locations, designate default addresses, validate Indian addresses and PIN codes against authoritative state registries, verify regional serviceability for products and shopping bags, and prepares a locked address contract for Phase 17 Checkout.

### Strict Phase Boundaries

> [!IMPORTANT]
> **What Phase 16 Owns:**
> * Customer address persistence and soft deletion
> * Address CRUD operations and ownership enforcement (IDOR protection)
> * Default address management with atomic transitions and deterministic deletion replacement
> * Indian 6-digit PIN code format validation and mobile phone normalization
> * Centralized delivery serviceability evaluation (`DeliveryServiceabilityService`)
> * Pluggable courier provider abstraction with configured database rule fallback
> * Public and authenticated serviceability query APIs with sliding-window rate limiting
> * In-memory TTL serviceability caching
> * Reusable address selector foundation for Phase 17 Checkout
> * Customer account address management page (`/account/addresses`)
> * Product detail page PIN code check integration (`PincodeChecker`)
> * Administrative serviceability rule management with Phase 5 RBAC and audit logging

> [!CAUTION]
> **Strict System Out-of-Scope Boundaries:**
> * Phase 16 does **NOT** create orders (Phase 19).
> * Phase 16 does **NOT** process or authorize payments (Phase 18).
> * Phase 16 does **NOT** calculate shipping fees or taxes (Phase 17/18).
> * Phase 16 does **NOT** allocate warehouses or reserve inventory (Phase 20).
> * Phase 16 does **NOT** generate shipping labels, airway bills (AWBs), or manifest shipments (Phase 21).
> * Phase 16 does **NOT** fabricate fake courier delivery SLAs or fake "Free Shipping" claims.

---

## 2. Customer Address Architecture

### 2.1 Address Data Model (`AddressSchema`)
Customer addresses are stored in the `addresses` collection, adhering to the Mongoose schema:

```typescript
Address {
  _id: ObjectId;
  customerId: ObjectId (ref: "Customer", required, index: true);
  type: "HOME" | "WORK" | "OTHER" (required, default: "HOME");
  fullName: string (required, trimmed, max 100);
  phone: string (required, normalized "+91 XXXXXXXXXX");
  addressLine1: string (required, trimmed, max 200);
  addressLine2?: string (optional, trimmed, max 200);
  landmark?: string (optional, trimmed, max 100);
  city: string (required, trimmed, max 100);
  state: string (required, authoritative Indian State / UT);
  country: string (required, default: "India");
  pincode: string (required, 6-digit Indian PIN code, index: true);
  isDefault: boolean (default: false);
  isDeleted: boolean (default: false, index: true);
  deletedAt: Date | null;
  coordinates?: { latitude: number; longitude: number };
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Database Indexes
To support high-throughput, low-latency queries and customer data isolation:
* `{ customerId: 1, isDeleted: 1, isDefault: -1 }`: Optimizes default address lookups and address listing per customer.
* `{ customerId: 1, createdAt: -1 }`: Enables fast deterministic replacement ordering.
* `{ pincode: 1 }`: Enables indexed lookups for logistics analytics.

---

## 3. Customer Ownership & Security Enforcement

### 3.1 Session-Derived Identity (Anti-Spoofing)
Every address mutation strictly derives the owner's identity from the authenticated server session (`requireCustomer()` via Clerk / session token).
* The client cannot specify or alter `customerId`, `userId`, or `ownerId`. Any client-submitted ownership fields are stripped server-side.

### 3.2 Insecure Direct Object Reference (IDOR) Mitigation
When performing `GET`, `PATCH`, or `DELETE` on `/api/addresses/:id`:
1. The server loads the address document.
2. If the address does not exist or is soft-deleted, returns `404 Not Found` (`AddressNotFoundError`).
3. If the address exists but `address.customerId !== authenticatedCustomer._id`, returns `403 Forbidden` (`AddressNotOwnedError`).
4. Unauthorized clients are prevented from reading, modifying, or deleting other clients' saved addresses.

---

## 4. Default Address Business Rules & Consistency

### 4.1 Initial Address Auto-Promotion
If an authenticated customer has **zero active addresses**, their first created address automatically receives `isDefault: true`, regardless of whether `isDefault` was requested.

### 4.2 Single Default Invariant
A customer can have at most **one** default address at any time. When an address is updated or created with `isDefault: true`:
1. The repository atomically sets `isDefault: false` across all other active addresses belonging to that customer.
2. The designated address is marked with `isDefault: true`.

### 4.3 Deterministic Replacement on Deletion
If a customer deletes their current default address:
1. The address is soft-deleted (`isDeleted: true`, `isDefault: false`).
2. The repository queries the **latest created active address** belonging to that customer (`findLatestActive(customerId)`).
3. If a replacement address is found, it is automatically promoted to `isDefault: true`.
4. If no other active addresses exist, the customer now has zero addresses.

---

## 5. Address Validation & Indian Localization

### 5.1 Authoritative Indian States Registry (`constants/india-states.ts`)
State values are validated against the authoritative 28 States and 8 Union Territories of India:
* Case-insensitive validation and automatic canonical name normalization (e.g. `"tamil nadu"` or `"TN"` &rarr; `"Tamil Nadu"`).
* Eliminates typos and inconsistent free-text entries.

### 5.2 Indian Mobile Telephone Validation
* Validates 10-digit Indian mobile numbers starting with 6, 7, 8, or 9 (`/^(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6-9]\d{9}$/`).
* Automatically strips prefixes (`+91`, `91`, or `0`) and stores the normalized telephone string (`+91 XXXXXXXXXX`).

### 5.3 Indian PIN Code Format Validation
* Validates 6 numeric digits with a non-zero starting digit (`/^[1-9][0-9]{5}$/`).
* Rejects malformed strings (`123`, `ABCDEF`, `012345`, `1234567`).

---

## 6. Delivery Serviceability Engine

### 6.1 Provider Abstraction (`IDeliveryServiceabilityProvider`)
The delivery subsystem is decoupled from third-party logistics partners via an adapter interface:

```
Storefront / Product Page / Cart
              │
              ▼
   DeliveryServiceabilityService
              │
              ├── In-Memory TTL Cache (15 min)
              │
              ▼
    ShippingProviderAdapter
              │
              ├── [If External API configured] ──► Third-Party Courier API
              │
              └── [Default Baseline] ────────────► RuleBasedServiceabilityProvider
                                                          │
                                                          ├── MongoDB ServiceabilityRuleModel
                                                          └── Curated Tier-1/Tier-2 Metro Baseline
```

### 6.2 No Fake Shipping Provider Policy
VÉRONA strictly enforces the **No Fake Shipping Provider** rule:
* If external logistics credentials (`SHIPROCKET_API_KEY`, `DELHIVERY_API_KEY`) are not configured, the engine evaluates configured database rules (`ServiceabilityRuleModel`) and the curated metropolitan baseline.
* It **never** fabricates fake API calls, fake delivery SLAs, or fake shipping fees.
* If an external courier encounters timeouts or network failure, the adapter catches the exception and returns `SERVICEABILITY_UNAVAILABLE` rather than crashing the storefront or guessing.

### 6.3 Clear Serviceability States
The engine returns discrete, deterministic states:
* `UNKNOWN`: Initial idle input state.
* `CHECKING`: Transient asynchronous validation.
* `SERVICEABLE`: Delivery is confirmed for this PIN code with verified estimated delivery days.
* `NOT_SERVICEABLE`: Regional courier coverage is currently unavailable for this PIN code.
* `INVALID_PINCODE`: Malformed or non-Indian PIN code format.
* `SERVICEABILITY_UNAVAILABLE`: Temporary downstream provider outage or configuration failure.

### 6.4 Serviceability Result Contract (`DeliveryServiceabilityResult`)
```typescript
interface DeliveryServiceabilityResult {
  serviceable: boolean;
  state: ServiceabilityState;
  postalCode: string;
  country: string;
  city?: string;
  stateName?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
  source: "CONFIGURED_RULES" | "PROVIDER_API" | "UNAVAILABLE";
  checkedAt: string;
}
```

---

## 7. Performance, Caching & Rate Limiting

### 7.1 In-Memory TTL Cache
* Valid PIN code serviceability results are cached in memory for **15 minutes** (`15 * 60 * 1000` ms) keyed by `${country}:${postalCode}`.
* The cache is automatically cleared when an administrator creates, updates, or deletes a serviceability rule.

### 7.2 Sliding-Window Rate Limiting (`lib/rate-limit.ts`)
* Public serviceability checks (`/api/delivery/serviceability`) are protected by an in-memory sliding-window limiter:
  * Limit: **60 requests per minute** per client IP.
  * Violations return `HTTP 429 Too Many Requests` with a `retryAfter` timestamp.
  * Stale memory records are purged on a 5-minute background timer.

### 7.3 Privacy & Non-Caching of Personalized Data
* Personalized customer addresses (`/account/addresses`, `/api/addresses`) are strictly designated as private:
  `Cache-Control: private, no-store, no-cache, must-revalidate`.
* Addresses are never cached on CDNs or public proxies.

---

## 8. Role-Based Access Control (RBAC) & Administrative APIs

Administrative rules are protected by Phase 5 RBAC:
* `serviceability.read`: View configured serviceability rules (`GET /api/admin/serviceability`, `GET /api/admin/serviceability/:id`).
* `serviceability.update`: Author, edit, or archive serviceability rules (`POST`, `PATCH`, `DELETE`).
* Every administrative mutation creates an immutable audit record in `AuditLogModel` capturing the operator ID, email, action type, and before/after state diff.

---

## 9. API Specifications

### Customer Endpoints
* `GET    /api/addresses` — List authenticated customer's saved addresses.
* `POST   /api/addresses` — Create a new address for authenticated customer.
* `GET    /api/addresses/:id` — Retrieve an address (with IDOR check).
* `PATCH  /api/addresses/:id` — Update an address (with IDOR check).
* `DELETE /api/addresses/:id` — Soft-delete an address with auto-default promotion.
* `PATCH  /api/addresses/:id/default` — Set an address as default.

### Public & Storefront Endpoints
* `GET  /api/delivery/serviceability?postalCode=600001&country=IN` — Check serviceability.
* `POST /api/delivery/serviceability` — Check serviceability with optional cart context.

### Admin Endpoints
* `GET    /api/admin/serviceability?page=1&limit=20&search=Mumbai` — List rules.
* `POST   /api/admin/serviceability` — Create a new postal serviceability rule.
* `GET    /api/admin/serviceability/:id` — Get rule details.
* `PATCH  /api/admin/serviceability/:id` — Update rule.
* `DELETE /api/admin/serviceability/:id` — Delete rule.

---

## 10. Phase 17 Checkout Contract Preparation

Phase 16 establishes the address selection contract for the upcoming checkout phase:

```typescript
export interface CheckoutAddressReference {
  addressId: string;
  fullName: string;
  phone: string;
  formattedAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: AddressType;
  isDefault: boolean;
}
```

The checkout flow in Phase 17 will consume `addressService.toCheckoutReference(address)` and `deliveryServiceabilityService.checkServiceability(...)` to lock the recipient and verify delivery before order authorization.
