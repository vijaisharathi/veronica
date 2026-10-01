# VÉRONA — REST API Specification & Endpoint Inventory

**System**: VÉRONA High-End Garments E-Commerce Platform  
**Document**: Production API Reference (Phase 30)  
**Status**: APPROVED FOR PRODUCTION  

---

## 1. Global API Standards

- **Base URL**: `https://verona.fashion/api`
- **Request Formats**: JSON (`Content-Type: application/json`)
- **Response Format**: Standardized `apiSuccess` / `apiError` envelope:
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "metadata": {
      "timestamp": "2026-09-28T12:00:00.000Z"
    }
  }
  ```
- **Error Format**:
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "INSUFFICIENT_PERMISSIONS",
      "message": "Access denied: Missing required permission 'customers.read'",
      "statusCode": 403
    }
  }
  ```
- **Idempotency**: All mutation endpoints accept an optional `Idempotency-Key` header.
- **Cache Control**: Administrative routes include `Cache-Control: private, no-store, no-cache, must-revalidate`.

---

## 2. Public Storefront & Commerce APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System liveness and readiness probe with DB connectivity |
| `GET` | `/api/products` | Public | Paginated product listing with filters and sorting |
| `GET` | `/api/products/[slug]` | Public | Product detail by slug with variants, images, and breadcrumbs |
| `GET` | `/api/products/[slug]/variants` | Public | Variant matrix resolution for product |
| `GET` | `/api/products/[slug]/reviews` | Public | Paginated verified reviews for product |
| `GET` | `/api/categories` | Public | Hierarchical category navigation tree |
| `GET` | `/api/collections` | Public | Active seasonal editorial collections |
| `GET` | `/api/search` | Public | Full-text catalog search with facets |
| `GET` | `/api/search/suggestions` | Public | Autocomplete suggestions for search input |
| `POST` | `/api/delivery/serviceability` | Public | Check delivery availability for a postal code |

---

## 3. Customer Account & Cart APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cart` | Session / Guest | Retrieve cart with active items and pricing breakdown |
| `POST` | `/api/cart/items` | Session / Guest | Add garment variant to shopping cart |
| `PATCH` | `/api/cart/items/[itemId]` | Session / Guest | Update item quantity in cart |
| `DELETE` | `/api/cart/items/[itemId]` | Session / Guest | Remove item from cart |
| `POST` | `/api/cart/coupon` | Session / Guest | Apply coupon code to cart |
| `DELETE` | `/api/cart/coupon` | Session / Guest | Remove coupon code from cart |
| `GET` | `/api/account/profile` | Customer Session | Retrieve customer profile details |
| `PATCH` | `/api/account/profile` | Customer Session | Update customer personal information |
| `GET` | `/api/addresses` | Customer Session | List customer saved delivery addresses |
| `POST` | `/api/addresses` | Customer Session | Add new delivery address |
| `PATCH` | `/api/addresses/[id]/default` | Customer Session | Set default delivery address |
| `GET` | `/api/orders` | Customer Session | List customer order history |
| `GET` | `/api/orders/[orderNumber]` | Customer Session | Get order details by order number (IDOR protected) |
| `POST` | `/api/orders/[orderNumber]/cancel` | Customer Session | Cancel eligible order prior to fulfillment |
| `GET` | `/api/account/returns` | Customer Session | List customer return requests |
| `POST` | `/api/account/returns` | Customer Session | Create return or exchange request |
| `GET` | `/api/account/support` | Customer Session | List customer concierge support tickets |
| `POST` | `/api/account/support` | Customer Session | Create customer support ticket |
| `POST` | `/api/account/support/[ticketNumber]/messages` | Customer Session | Append message to support ticket |

---

## 4. Checkout & Payment APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/checkout` | Customer Session | Initialize checkout session with cart snapshot |
| `POST` | `/api/checkout/[id]/address` | Customer Session | Attach verified delivery address to checkout |
| `POST` | `/api/checkout/[id]/payment-ready` | Customer Session | Lock pricing and verify inventory before payment |
| `POST` | `/api/payments/create` | Customer Session | Create Razorpay order with server-calculated minor amount |
| `POST` | `/api/payments/verify` | Customer Session | Cryptographically verify payment signature and formulate order |

---

## 5. Webhook Ingestion APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/webhooks/razorpay` | HMAC Signature | Ingest payment, captured, and refund events idempotently |
| `POST` | `/api/webhooks/resend` | HMAC Signature | Track email delivery, bounce, and open callbacks |
| `POST` | `/api/webhooks/shipping` | HMAC Signature | Carrier shipment milestone updates and delivery tracking |

---

## 6. Administrative Management APIs (RBAC Protected)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | `ADMIN_READ` | Consolidated KPIs, alerts, revenue figures |
| `GET` | `/api/admin/products` | `PRODUCTS_READ` | Paginated product catalog directory |
| `POST` | `/api/admin/products` | `PRODUCTS_CREATE` | Create luxury product |
| `PATCH` | `/api/admin/products/[id]` | `PRODUCTS_UPDATE` | Update product attributes |
| `POST` | `/api/admin/products/[id]/publish` | `PRODUCTS_PUBLISH` | Validate invariants and publish product |
| `GET` | `/api/admin/orders` | `ORDERS_READ` | Admin order directory with status filters |
| `PATCH` | `/api/admin/orders/[id]/status` | `ORDERS_STATUS_UPDATE`| Transition order state machine |
| `GET` | `/api/admin/fulfillment` | `FULFILLMENT_READ` | Fulfillment batches and warehouse allocations |
| `POST` | `/api/admin/fulfillment/[id]/allocate` | `FULFILLMENT_ALLOCATE`| Allocate order items to warehouse facility |
| `GET` | `/api/admin/customers` | `CUSTOMERS_READ` | Paginated customer accounts directory |
| `GET` | `/api/admin/customers/[id]` | `CUSTOMERS_READ` | 360° customer operational portfolio |
| `POST` | `/api/admin/customers/[id]/suspend` | `CUSTOMERS_SUSPEND` | Suspend customer account with reason |
| `GET` | `/api/admin/staff` | `STAFF_READ` | Workforce directory |
| `POST` | `/api/admin/staff` | `STAFF_CREATE` | Onboard staff member |
| `PATCH` | `/api/admin/staff/[id]/roles` | `STAFF_ROLES_MANAGE`| Assign roles (anti-self-escalation protected) |
| `PATCH` | `/api/admin/staff/[id]/scope` | `STAFF_SCOPE_MANAGE`| Assign warehouse facility scope |
| `GET` | `/api/admin/roles` | `ROLES_READ` | Role matrix explorer |
| `GET` | `/api/admin/permissions` | `STAFF_PERMISSIONS_READ`| Permission catalog grouped by domain |
| `GET` | `/api/admin/settings` | `SETTINGS_READ` | Platform settings (Store, Maintenance, Feature Flags) |
| `PATCH` | `/api/admin/settings` | `SETTINGS_UPDATE` | Update settings (secret blacklist enforced) |
| `GET` | `/api/admin/audit-logs` | `AUDIT_READ` | Query append-only audit trail |
| `GET` | `/api/admin/audit-logs/export` | `AUDIT_EXPORT` | Export compliance audit trail to CSV |
