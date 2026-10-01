# VÉRONA — Customer, Staff & Platform Administration Architecture (Phase 29)

## 1. Executive Overview

Phase 29 establishes the centralized administrative control plane for **VÉRONA**. It integrates with the complete portfolio of preceding domains to provide unified management across three operational pillars:
1. **Customer Administration & Operational Context**: Customer directory, lifecycle status transitions (active/suspended), address governance, and aggregated 360° visibility over orders, returns, refunds, reviews, support tickets, and communication preferences.
2. **Staff Administration & RBAC Governance**: Workforce directory, onboarding, granular role assignment, warehouse operational scoping, self-escalation prevention, and last Super Admin protection.
3. **Platform Settings & Audit Immutability**: Strongly-typed platform settings with cryptographic secret exclusion, operational feature toggles, maintenance mode controls, and append-only audit trail logging.

---

## 2. Strict Architectural Boundaries

Phase 29 is strictly an administrative control plane over existing domain services and does not duplicate domain engines:

| Domain Layer | Authoritative Phase | Phase 29 Boundary & Responsibility |
|---|---|---|
| **Identity & Authentication** | **Phase 4** | Consumes `authProviderId` (Clerk/Session). Does NOT store passwords, hashes, tokens, or bypass authentication. |
| **Authorization & RBAC** | **Phase 5** | Enforces granular server-side permissions (`CUSTOMERS_*`, `STAFF_*`, `ROLES_*`, `SETTINGS_*`, `AUDIT_*`). Centralized role definitions. |
| **Addresses & Delivery** | **Phase 16** | Reuses `AddressModel`. Queries strictly scoped to `customerId` to prevent IDOR. |
| **Orders & States** | **Phase 19** | Reuses `OrderModel` for read-only customer order metrics and summaries. |
| **Inventory & Warehouses** | **Phase 20** | Reuses `WarehouseModel` to enforce warehouse-scoped access controls on workforce. |
| **Fulfillment & Shipping** | **Phase 21** | Respects staff warehouse scope for fulfillment operations. |
| **Returns & Exchanges** | **Phase 22** | Reuses `ReturnRequestModel` to display customer return summaries. |
| **Refunds** | **Phase 23** | Reuses `RefundModel` to display customer refund totals. No financial mutation here. |
| **Reviews & Ratings** | **Phase 24** | Reuses `ReviewModel` to display customer review counts and moderation states. |
| **Notifications** | **Phase 25** | Reads customer communication preferences; status changes emit domain events for Phase 25. |
| **Customer Support** | **Phase 26** | Reuses `SupportTicketModel` to summarize ticket backlog on customer profiles. |
| **Admin Dashboard** | **Phase 27** | Enhances existing dashboard cockpit with customer & workforce KPI widgets. |
| **Product, Content & Marketing** | **Phase 28** | Administrative role catalog protects catalog and marketing permissions. |
| **Platform Administration** | **Phase 29** | **Owns Customers, Staff, Roles/Permissions, Platform Settings, and Audit Trail.** |
| **Production Hardening & Deployment** | **Phase 30** | **STRICTLY NOT STARTED.** |

---

## 3. Customer Administration

### 3.1 Customer Directory & Server-Side Pagination
- **Endpoint**: `GET /api/admin/customers`
- **Guards**: Protected by `CUSTOMERS_READ` or `CUSTOMERS_MANAGE`.
- **Search**: Indexed regex search matching email, first name, last name, phone, or exact MongoDB `_id`.
- **Filters**: Account status (`ACTIVE`, `SUSPENDED`), verification state (`emailVerified`), date range (`createdAt`).
- **Pagination**: Server-side pagination preventing full collection loads into memory.
- **Aggregation**: Batch aggregation of order metrics (`orderCount`, `totalSpendMinor`) per page to eliminate N+1 database queries.

### 3.2 Customer Operational Context (360° Profile)
- **Endpoint**: `GET /api/admin/customers/:id`
- Assembles a unified operational portfolio without duplicating business logic:
  - **Profile**: Name, email, phone, verification states, preferences, registration timestamp, last login.
  - **Orders**: Lifetime order count, total spend in minor units, top recent orders.
  - **Returns**: Total return requests, return reasons, current disposition states.
  - **Refunds**: Total refunded amount, refund attempt statuses.
  - **Reviews**: Total reviews submitted, average rating, moderation breakdown (published, pending, rejected).
  - **Support**: Ticket backlog, open ticket counts, recent support interactions.
  - **Notification Preferences**: Channels opted-in (Marketing Email, SMS, WhatsApp).
  - **Unified Timeline**: Chronologically sorted timeline interleaving account creation, orders placed, returns requested, and support tickets.

### 3.3 Customer Status Lifecycle (Suspension & Restoration)
- **Endpoints**: `POST /api/admin/customers/:id/suspend`, `POST /api/admin/customers/:id/restore`
- **Permissions**: `CUSTOMERS_SUSPEND` for suspension; `CUSTOMERS_RESTORE` for restoration.
- **Guards**: Requires explicit audit justification (minimum 3 characters).
- **Audit**: Writes append-only audit trail capturing actor, previous state, new state, reason, IP, and user-agent.
- **Preservation**: Suspending an account revokes access to checkout, returns, and support interactions without destroying historical financial or order records.

### 3.4 Address Governance & IDOR Protection
- **Endpoint**: `GET /api/admin/customers/:id/addresses`
- **Permissions**: `CUSTOMERS_ADDRESSES_READ` or `CUSTOMERS_READ`.
- **IDOR Guard**: Addresses can only be retrieved by explicitly querying against `customerId`. Direct address ID lookup without customer ownership is denied.

---

## 4. Staff Administration & RBAC

### 4.1 Staff Model & Onboarding
- **Endpoint**: `POST /api/admin/staff`
- **Permission**: `STAFF_CREATE`.
- **Validation**: Enforces unique email, required names, and at least one valid active role.
- **Identity Boundary**: Integrates with Phase 4 auth; does not store plaintext or custom passwords.

### 4.2 Security Guards & Protections

#### 1. Self-Escalation Prevention
A staff member cannot modify their own assigned roles.
```typescript
if (actorStaff._id.toString() === targetStaffId) {
  throw new AuthorizationError(
    "Staff members are strictly prohibited from altering their own assigned roles",
    "SELF_ESCALATION_BLOCKED"
  );
}
```

#### 2. Super Admin Assignment Restriction
Only active Super Admins are authorized to grant the `SUPER_ADMIN` role to any staff member.

#### 3. Last Super Admin Protection
The platform cannot become ownerless. If only one active Super Admin remains:
- Attempting to suspend that Super Admin throws `ConflictError("Cannot suspend the final active Super Admin of the platform")`.
- Attempting to remove the Super Admin role from that staff member throws `ConflictError("Cannot remove the Super Admin role from the final active Super Admin")`.

### 4.3 Warehouse Scoping
- **Endpoint**: `PATCH /api/admin/staff/:id/scope`
- **Permission**: `STAFF_SCOPE_MANAGE`.
- Staff members can be restricted to an operational warehouse (e.g., `WH-BLR-01`) or granted global access (`null`).
- Warehouse staff can only query fulfillment and inventory data within their assigned warehouse scope.

---

## 5. Platform Settings & Secret Protection

### 5.1 Clear Separation of Secrets vs. Settings
- **Environment / Secret Manager**: API keys (`RAZORPAY_KEY_SECRET`), authentication credentials (`CLERK_SECRET_KEY`), transactional email tokens (`RESEND_API_KEY`), and database connection strings are strictly managed via environment variables.
- **Platform Settings (`SystemSettingsModel`)**: Governs operational configuration:
  - `store.info`: Public store name, legal entity name, concierge support email, phone, currency (`INR`), locale (`en-IN`), timezone (`Asia/Kolkata`), physical store address.
  - `platform.maintenance`: Maintenance mode active state, public message banner, allowed IP whitelist.
  - `platform.feature_flags`: Operational feature toggles (`enableReviews`, `enableWishlist`, `enableCouponDiscounts`, `enableReturnPickupScheduling`, `enableInternationalShipping`).

### 5.2 Secret Blacklist Enforcement
The system incorporates an automated regex blacklist (`isSecretSettingKey`) preventing storage or inspection of secret keys:
```typescript
const FORBIDDEN_SECRET_KEYS = [
  /secret/i, /password/i, /private[_-]?key/i, /api[_-]?key/i,
  /token/i, /credential/i, /razorpay[_-]?(key|secret)/i,
  /clerk[_-]?(secret|key)/i, /resend[_-]?key/i,
];
```

---

## 6. Audit Log Administration

### 6.1 Immutability
- The `AuditLog` collection enforces append-only immutability.
- In `AuditLogSchema`: `timestamps: { createdAt: true, updatedAt: false }`.
- There are strictly **NO update or delete APIs** for audit logs.

### 6.2 Audit Log Querying & Inspection
- **Endpoint**: `GET /api/admin/audit-logs`
- **Guards**: `AUDIT_READ`.
- **Filters**: Actor ID, actor type (`STAFF`, `CUSTOMER`, `SYSTEM`), action (e.g., `staff.created`, `customer.suspended`, `platform.setting_changed`), entity type, date range.
- **Detail View**: `GET /api/admin/audit-logs/:id` returns full before and after state diffs.

### 6.3 Audited Exports
- **Endpoint**: `GET /api/admin/audit-logs/export`
- **Guards**: `AUDIT_EXPORT`.
- Every export execution records an immutable audit log entry (`audit.exported`).

---

## 7. API Reference Matrix

| Method | Endpoint | Permission Required | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/customers` | `customers.read` or `customers.manage` | List customers with search, status filters, and pagination |
| `GET` | `/api/admin/customers/:id` | `customers.read` or `customers.manage` | Retrieve customer 360° operational detail |
| `POST` | `/api/admin/customers/:id/suspend` | `customers.suspend` | Suspend customer account with audit reason |
| `POST` | `/api/admin/customers/:id/restore` | `customers.restore` | Restore suspended customer account |
| `GET` | `/api/admin/customers/:id/addresses` | `customers.addresses.read` or `customers.read` | Get customer addresses scoped to customerId |
| `GET` | `/api/admin/customers/export` | `customers.manage` | Export sanitized customer data |
| `GET` | `/api/admin/staff` | `staff.read` or `staff.create` or `staff.update` | List workforce accounts with filters |
| `POST` | `/api/admin/staff` | `staff.create` | Onboard staff account with roles and warehouse scope |
| `GET` | `/api/admin/staff/:id` | `staff.read` | Inspect staff detail, effective permissions, and activity |
| `PATCH` | `/api/admin/staff/:id` | `staff.update` | Update staff profile details |
| `POST` | `/api/admin/staff/:id/suspend` | `staff.suspend` | Suspend staff account (Last Super Admin protected) |
| `POST` | `/api/admin/staff/:id/restore` | `staff.restore` | Restore suspended staff account |
| `PATCH` | `/api/admin/staff/:id/roles` | `staff.roles.manage` | Assign roles (Self-escalation & Super Admin protected) |
| `PATCH` | `/api/admin/staff/:id/scope` | `staff.scope.manage` | Assign warehouse operational scope |
| `GET` | `/api/admin/roles` | `roles.read` or `roles.manage` | List roles with active staff counts |
| `GET` | `/api/admin/roles/:id` | `roles.read` or `roles.manage` | Get role detail and permissions |
| `PATCH` | `/api/admin/roles/:id` | `roles.manage` | Update role assigned permissions |
| `GET` | `/api/admin/permissions` | `staff.permissions.read` or `roles.read` | List centralized system permissions catalog |
| `GET` | `/api/admin/settings` | `settings.read` or `settings.manage` | Retrieve platform settings (secrets excluded) |
| `PATCH` | `/api/admin/settings` | `settings.manage` | Update platform settings with typed validation |
| `GET` | `/api/admin/audit-logs` | `audit.read` | Query append-only audit records |
| `GET` | `/api/admin/audit-logs/:id` | `audit.read` | Inspect audit record before/after state |
| `GET` | `/api/admin/audit-logs/export` | `audit.export` | Audited export of system audit trail |

---

## 8. Verification & Test Suite

All Phase 29 capabilities are verified by automated test suites:
- `tests/unit/admin-customer-management.test.ts`: Customer query schema, status updates, reason validations.
- `tests/unit/admin-staff-management.test.ts`: Workforce onboarding, role updates, warehouse scope.
- `tests/unit/admin-security-and-escalation.test.ts`: Self-escalation prevention, last Super Admin protection.
- `tests/unit/admin-platform-settings.test.ts`: Secret key exclusion, typed schemas (Store, Maintenance, Feature Flags).
- `tests/unit/admin-audit-log.test.ts`: Append-only immutability, query validation, audit trail capture.
