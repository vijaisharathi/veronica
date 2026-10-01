# VÉRONA — Complete System Architecture Specification

**System**: VÉRONA High-End Garments E-Commerce Platform  
**Document**: Architecture Blueprint (Phase 30)  
**Status**: APPROVED FOR PRODUCTION  

---

## 1. High-Level Architectural Blueprint

```
                                [ Storefront Shopper ]         [ Staff & Executive Operators ]
                                          │                                   │
                                          ▼                                   ▼
                                ┌───────────────────┐               ┌───────────────────┐
                                │ Next.js Storefront│               │  Next.js Admin UI │
                                │ (App Router / SSR)│               │(RBAC Guarded View)│
                                └─────────┬─────────┘               └─────────┬─────────┘
                                          │                                   │
══════════════════════════════════════════╪═══════════════════════════════════╪═══════════════════════════════════════
                                          ▼                                   ▼
                               ┌─────────────────────────────────────────────────────┐
                               │             Edge Middleware Foundation              │
                               │  - Request Correlation ID (x-request-id)            │
                               │  - Security Headers (HSTS, CSP, X-Frame, Referrer)  │
                               └──────────────────────────┬──────────────────────────┘
                                                          │
                                                          ▼
                               ┌─────────────────────────────────────────────────────┐
                               │               REST API Service Layer                │
                               │  - NextRequest / NextResponse Route Handlers        │
                               │  - Zod Request Body & Query Validation              │
                               │  - Clerk Session & RBAC Permission Guards           │
                               │  - Standardized JSON Response (apiSuccess/apiError) │
                               └──────────────────────────┬──────────────────────────┘
                                                          │
══════════════════════════════════════════════════════════╪═══════════════════════════════════════════════════════════
                                                          ▼
                               ┌─────────────────────────────────────────────────────┐
                               │               Domain Services Engine                │
                               ├──────────────────────────┬──────────────────────────┤
                               │ Commerce Domain:         │ Order Operations Domain: │
                               │ - Catalog & Products     │ - Order State Machine    │
                               │ - Garment Variants       │ - Multi-Warehouse Ledgers│
                               │ - Pricing & Promotions   │ - Inventory Reservation  │
                               │ - Shopping Cart Engine   │ - Fulfillment Logistics  │
                               │ - Checkout Session       │ - Carrier Integration    │
                               ├──────────────────────────┼──────────────────────────┤
                               │ Post-Purchase & Concierge│ Platform Administration: │
                               │ - Returns & Exchanges    │ - 360° Customer Profiles │
                               │ - Refund Calculations    │ - Staff Workforce Scopes │
                               │ - Reviews & Ratings      │ - Anti-Self-Escalation   │
                               │ - Support Ticket SLAs    │ - Platform Settings      │
                               │ - Event Notifications    │ - Immutable Audit Trail  │
                               └──────────────────────────┬──────────────────────────┘
                                                          │
══════════════════════════════════════════════════════════╪═══════════════════════════════════════════════════════════
                                                          ▼
                               ┌─────────────────────────────────────────────────────┐
                               │           Persistence & External Adapters           │
                               ├──────────────────────────┬──────────────────────────┤
                               │ MongoDB Atlas (Mongoose) │ External Services:       │
                               │ - Connection Pooling     │ - Clerk (Identity)       │
                               │ - Compound Query Indexes │ - Razorpay (Payments)    │
                               │ - Lean Projection Reads  │ - Resend (Transactional) │
                               │ - Transaction Sessions   │ - Cloudinary (Media CDN) │
                               └──────────────────────────┴──────────────────────────┘
```

---

## 2. Domain Authority & Modular Boundaries

The VÉRONA platform enforces clean separation of concerns across domain boundaries:

| Domain | Authority Phase | Primary Responsibilities | Cross-Domain Invariants |
|---|---|---|---|
| **Identity & Authentication** | Phase 4 | User signup, login, session tokens, Clerk identity webhooks. | Does not mutate customer orders or cart data directly. |
| **Authorization & RBAC** | Phase 5 | Role catalog, permission matrices, server-side guards (`requirePermission`). | Zero client-side role trust; all checks enforced on server. |
| **Catalog & Taxonomies** | Phases 8, 9, 12 | Categories (DAG validation), Collections, Products, Garment Variants (Color $\times$ Size). | Cannot unpublish product if active cart items reference it. |
| **Pricing Engine** | Phase 15 | Minor-unit integer arithmetic, promotional campaign priority, coupon redemption limits. | Authoritative pricing calculated only on server; no client totals trusted. |
| **Inventory & Warehouses** | Phase 20 | Multi-warehouse stock ledgers, atomic reservation locks, auto-expiry cleanup. | Invariant: `available + reserved + consumed = totalStock`. No negative stock. |
| **Checkout & Payments** | Phases 17, 18 | Checkout sessions, delivery serviceability checks, Razorpay orders, HMAC SHA-256 verification. | Order only formulated upon cryptographically verified payment. |
| **Order Management** | Phase 19 | Order lifecycle finite state machine, immutable financial snapshots, status history. | No backward or illegal state regressions (e.g. `DELIVERED -> PROCESSING`). |
| **Fulfillment & Logistics** | Phase 21 | Warehouse allocation, wave picking, packing, shipment creation, carrier callbacks. | Shipment items cannot exceed confirmed order line quantities. |
| **Returns & Refunds** | Phases 22, 23 | Return eligibility, pickup inspection, item disposition, gateway refund dispatch. | Invariant: cumulative refunds cannot exceed captured payment amount. |
| **Customer Concierge** | Phase 26 | Support tickets, threaded messaging, SLA prioritization, IDOR isolation. | Customers can only access their own support tickets. |
| **Platform Administration** | Phase 29 | 360° customer portfolios, workforce scoping, anti-lockout protection, audit trail. | Last Super Admin cannot be suspended or demoted. |
| **Release & Security** | Phase 30 | Production auditing, security headers, dynamic sitemap/robots, runbooks. | Zero plain-text secrets; fail-closed security. |

---

## 3. Financial Consistency & Money Handling

All monetary amounts across VÉRONA are strictly handled in **integer minor units (paise)**:
- ₹1,000.00 is stored and calculated as `100000`.
- Zero floating-point arithmetic in discount calculations, taxes, or order totals.
- Half-up commercial rounding is applied deterministically in `PricingService.calculatePercentageDiscount`.
- When orders are placed, an immutable snapshot of all pricing, taxes, shipping fees, and discounts is permanently captured in the order record (`pricing` snapshot). Future catalog price changes never alter historical orders.

---

## 4. Multi-Tenant & RBAC Security Guarantees

1. **Customer Data Isolation (Anti-IDOR)**:
   - Every customer endpoint resolves identity from the verified session (`requireCustomer()`).
   - Query filters explicitly include `customerId: session.customerId`, ensuring one customer can never inspect or mutate another customer's orders, addresses, wishlists, reviews, or tickets.
2. **Staff Hierarchy & Anti-Self-Escalation**:
   - Staff members cannot modify their own roles or assign permissions beyond their own ceiling.
   - Only `SUPER_ADMIN` can assign `SUPER_ADMIN`.
   - The platform strictly enforces anti-lockout: the last active `SUPER_ADMIN` in the database cannot be suspended, deleted, or demoted.
3. **Regional Warehouse Scoping**:
   - Warehouse staff assigned to facility `wh_mumbai_01` can only view and fulfill inventory and orders within that warehouse's jurisdiction.

---

## 5. Append-Only Security Audit Logging

All administrative actions (customer suspension, staff creation, role mutations, setting updates, inventory manual adjustments, refund authorizations) write immutable audit records to `AuditLogModel`:
- Captures: `actorId`, `actorEmail`, `action`, `entityType`, `entityId`, `beforeState`, `afterState`, `ipAddress`, `userAgent`.
- Schema explicitly disables updates (`timestamps: { createdAt: true, updatedAt: false }`).
- Audit log records can be queried and exported by authorized compliance officers but can never be modified or deleted through application APIs.
