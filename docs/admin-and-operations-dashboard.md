# VÉRONA — Admin & Operations Dashboard System Documentation (Phase 27)

## 1. Architectural Philosophy & Overview
The **Admin & Operations Dashboard** is the centralized operational cockpit for authorized internal staff of VÉRONA. It functions strictly as an **orchestration, visualization, and operational-control layer**, consuming existing authoritative domain services without re-implementing or duplicating underlying domain business logic.

### Canonical Domain Ownership Map
- **Phase 19** $\rightarrow$ Order State Machine & Snapshot Immutability
- **Phase 20** $\rightarrow$ Inventory Stock Invariants & Warehouse Management
- **Phase 21** $\rightarrow$ Fulfillment Workflows & Shipping Logistics
- **Phase 22** $\rightarrow$ Returns & Garment Exchanges
- **Phase 23** $\rightarrow$ Refunds & Financial Gateway Settlements
- **Phase 24** $\rightarrow$ Customer Reviews & UGC Moderation
- **Phase 25** $\rightarrow$ Multi-Channel Communications & Delivery Retries
- **Phase 26** $\rightarrow$ Customer Support Tickets & SLA Policy Engine
- **Phase 27** $\rightarrow$ **Admin & Operations Dashboard Orchestration & Search**

---

## 2. Route Structure & Endpoints

### Storefront vs. Admin Boundary
Storefront customer routes (`/account/*`) and administrative routes (`/admin/*`) are strictly isolated. All administrative pages and endpoints enforce server-side authentication (`requireStaff()`) and granular RBAC checks (`requirePermission(...)`).

### Admin Page Routes
| Route | Guard Permission | Purpose |
|---|---|---|
| `/admin` | `admin.dashboard.read` | Central operations cockpit, KPI grid, operational alerts, and domain overview cards. |
| `/admin/orders` | `orders.read` | Paginated order list, status filter, customer search, and order detail drawer. |
| `/admin/orders/[orderNumber]` | `orders.read` | Direct drill-down inspection for an order snapshot, purchased garments, and audit trail. |
| `/admin/inventory` | `inventory.read` | Stock on hand, reservations, available units, SKU search, and low-stock filters. |
| `/admin/warehouses` | `warehouses.read` | Hub list, operational status, capacity, and fulfillment allocation. |
| `/admin/fulfillment` | `fulfillment.read` | Logistics tracking, courier statuses, ready-for-pickup, and delivery exceptions. |
| `/admin/payments` | `payments.read` | Payment attempts, gateway transaction IDs, status breakdown, and reconciliation. |
| `/admin/payments/[id]` | `payments.read` | Transaction details and payment attempt history. |
| `/admin/refunds` | `refunds.read` | Authoritative settlement overview, retry pending, and gateway reversal audits. |
| `/admin/returns` | `returns.read` | Return requests, QC inspection queue, disposition, and exchange handling. |
| `/admin/reviews` | `reviews.read` | Review moderation queue, reported content, and publication actions. |
| `/admin/notifications` | `notifications.read` | Delivery attempts, failure monitoring, and manual dispatch retry. |
| `/admin/support` | `support.read` | Customer support ticket queue, assignment, and SLA risk tracking. |
| `/admin/support/[ticketNumber]` | `support.read` | Multi-turn conversation thread, public replies, and staff-only internal notes. |

### Admin API Endpoints
| HTTP Method | Route | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Compiles permission-filtered `AdminDashboardDTO` for the requested time range. |
| `GET` | `/api/admin/dashboard/kpis` | Lightweight endpoint returning only the permission-gated KPI metrics. |
| `GET` | `/api/admin/dashboard/alerts` | Real-time evaluation of active operational alerts. |
| `GET` | `/api/admin/search` | Federated cross-domain search across Orders, Products, Customers, Payments, Refunds, Tickets, and Reviews. |
| `GET` | `/api/admin/payments` | Paginated payment transactions with search and status filtering. |
| `GET` | `/api/admin/payments/[id]` | Full payment details and attempt timeline. |
| `POST` | `/api/admin/payments/[id]/reconcile` | Reconciles payment status against the payment gateway and logs audit entry. |

---

## 3. Role-Based Visibility & Warehouse Scoping

### Role-Permission Matrix
- **Super Admin (`SUPER_ADMIN`)**: Unrestricted access to all operational dashboards, financial settlements, staff roles, and audit trails.
- **Admin (`ADMIN`)**: Complete operational visibility across orders, inventory, fulfillment, payments, refunds, returns, reviews, notifications, and support.
- **Order Manager (`ORDER_MANAGER`)**: Focuses on Orders, Fulfillment, Shipments, Returns, and Payments.
- **Inventory Manager (`INVENTORY_MANAGER`)**: Focuses on Inventory, Warehouses, Stock movements, and Low-stock alerts.
- **Support Agent (`SUPPORT_AGENT`)**: Focuses on Support tickets, SLA tracking, customer-safe order/refund/shipment context.
- **Marketing Manager (`MARKETING_MANAGER`)**: Focuses on Campaigns, Coupons, Reviews, and Collections.
- **Warehouse Staff (`WAREHOUSE_STAFF`)**: Scoped strictly to their assigned warehouse (`staff.assignedWarehouseId`).

### Warehouse Scoping Invariant
When a staff member possesses an `assignedWarehouseId` (e.g. Warehouse Staff):
1. **Inventory Queries**: Filtered strictly to `warehouseId === assignedWarehouseId`.
2. **Dashboard Widgets**: Out-of-stock and low-stock variants are aggregated exclusively for the assigned hub.
3. **Data Privacy**: Customer support tickets, payment secrets, and financial settlements are excluded from the staff member's view.

---

## 4. Key Performance Indicator (KPI) Definitions

All financial metrics are calculated in **integer minor units** (paise) and formatted as INR at presentation time.

| KPI Key | Label | Documented Calculation & Definition |
|---|---|---|
| `orders_volume` | Orders In Window | Count of orders created within the selected date boundary (`start <= createdAt <= end`). |
| `orders_pending` | Active Orders | Count of orders currently in `PENDING`, `CONFIRMED`, or `PROCESSING` status. |
| `revenue_collected` | Net Collected Revenue | Sum of `amount` (in minor units) for all payments in `CAPTURED` status within the date window. |
| `payments_pending` | Unconfirmed Payments | Count of payment records currently in `PENDING` or `UNKNOWN` status. |
| `inventory_out_of_stock` | Out of Stock Variants | Count of active garment variants with `availableStock <= 0`. |
| `inventory_low_stock` | Low Stock Alert | Count of active garment variants where `availableStock > 0` and `availableStock <= reorderThreshold`. |
| `refunds_pending` | Pending Refunds | Count of refund records in `REQUESTED`, `INITIATED`, or `PROCESSING` status. |
| `returns_pending` | Returns Awaiting Review | Count of return requests in `RETURN_REQUESTED` status. |
| `support_open_tickets` | Open Support Tickets | Count of support tickets in `OPEN`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, or `REOPENED` status. |
| `support_urgent_tickets` | Urgent Support Tickets | Count of active support tickets with `priority: URGENT`. |
| `reviews_pending` | Reviews to Moderate | Count of customer product reviews in `PENDING` moderation status. |
| `notifications_failed` | Failed Deliveries | Count of communication delivery attempts in `FAILED` status within the date window. |

---

## 5. Operational Alert Catalog

Operational alerts are evaluated server-side and classified by centralized severity (`CRITICAL`, `WARNING`, `INFO`). Repeated issues are deduplicated using stable composite identifiers.

| Alert Type | Severity | Trigger Threshold | Primary Action Link |
|---|---|---|---|
| `SUPPORT_SLA_BREACH` | `CRITICAL` | Any active ticket with priority `URGENT` or where `resolutionDeadline < now`. | `/admin/support?priority=URGENT` |
| `REFUND_FAILURE` | `CRITICAL` | Any refund record in `FAILED` status. | `/admin/refunds?status=FAILED` |
| `PAYMENT_RECONCILIATION_REQUIRED` | `WARNING` | Payment sessions in `PENDING`/`UNKNOWN` for > 30 minutes. | `/admin/payments?status=PENDING` |
| `SHIPMENT_EXCEPTION` | `WARNING` | Shipments in `FAILED`, `CANCELLED`, `RTO_INITIATED`, or `RTO_DELIVERED`. | `/admin/fulfillment` |
| `FULFILLMENT_BACKLOG` | `WARNING` | Orders in `CONFIRMED` status placed > 24 hours ago. | `/admin/orders?status=CONFIRMED` |
| `CRITICAL_INVENTORY_SHORTAGE` | `WARNING` | Active garment variants with zero available inventory. | `/admin/inventory?filter=out-of-stock` |
| `NOTIFICATION_DELIVERY_FAILURE` | `INFO` | Notification delivery attempts failed in the last 24 hours. | `/admin/notifications` |
| `REVIEW_MODERATION_BACKLOG` | `INFO` | Product reviews pending moderation for > 24 hours. | `/admin/reviews?status=PENDING` |

---

## 6. Federated Cross-Domain Search

The search engine (`adminSearchService.search`) executes asynchronous queries across 8 domains in parallel:
- **Orders**: Matched by `orderNumber`, customer name, or customer email (requires `orders.read`).
- **Products & SKUs**: Matched by product name, variant title, or SKU code (requires `products.read` or `inventory.read`).
- **Customers**: Matched by customer name, email, or phone number (requires `customers.read`).
- **Payments**: Matched by provider order ID, provider payment ID, or checkout session ID (requires `payments.read`).
- **Refunds**: Matched by refund number or gateway refund ID (requires `refunds.read`).
- **Returns**: Matched by return number (requires `returns.read`).
- **Support Tickets**: Matched by ticket number or subject (requires `support.read`).
- **Reviews**: Matched by review title or review text (requires `reviews.read`).

**Security Guarantee**: Domains for which the caller lacks permissions are completely omitted from the database query pipeline, ensuring no leakage of restricted metadata.

---

## 7. Partial Failure Isolation Strategy

The dashboard aggregation engine uses `Promise.allSettled` to fetch domain summaries:
- If a single subsystem query fails (e.g. inventory aggregation encounters a database timeout), the error is caught and cataloged under `partialFailures: [{ widget: "inventory", error: "..." }]`.
- Remaining widgets (Orders, Fulfillment, Payments, Support, Alerts) load and render without disruption.
- The client UI presents a localized notification for the degraded widget with an in-place retry button.
