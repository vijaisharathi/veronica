# VÉRONA — Phase 05: Authorization, RBAC & Role Isolation Documentation

This document defines the authorization infrastructure, Role-Based Access Control (RBAC) model, route isolation, and server-side guards for **VÉRONA**.

---

## 1. Authentication vs Authorization

* **Authentication ("Who are you?")**: Verified by Clerk and mapped to a VÉRONA Customer or Staff record.
* **Authorization ("What are you allowed to do?")**: Enforced server-side using VÉRONA's role and permission architecture.

```text
                   ┌─────────────────┐
                   │   HTTP Request  │
                   └────────┬────────┘
                            ↓
                   ┌─────────────────┐
                   │ Authentication  │
                   │ (Clerk Session) │
                   └────────┬────────┘
                            ↓
                   ┌─────────────────┐
                   │ Identity Record │
                   │ Customer/Staff  │
                   └────────┬────────┘
                            ↓
              ┌──────────────────────────┐
              │ Customer / Staff Branch  │
              └────────────┬─────────────┘
                           ↓
                  ┌─────────────────┐
                  │ Role Resolution │
                  └────────┬────────┘
                           ↓
                ┌─────────────────────┐
                │ Permission Resolver │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Authorization Check │
                └──────────┬──────────┘
                           ↓
                    ALLOW / DENY
```

---

## 2. VÉRONA System Roles

1. `CUSTOMER`: Standard consumer account. Permitted for self-service actions (`account.*.self`, `orders.read.self`, `cart.*.self`, `wishlist.*.self`).
2. `SUPER_ADMIN`: Root operator. Automatically possesses all registered platform permissions.
3. `ADMIN`: Full operational supervisor across catalog, orders, inventory, customers, marketing, and support.
4. `INVENTORY_MANAGER`: Warehouse and catalog inventory supervisor (`inventory.*`, `warehouses.*`, `products.read/update`).
5. `ORDER_MANAGER`: Order fulfillment supervisor (`orders.*`, `shipments.*`, `returns.*`).
6. `SUPPORT_AGENT`: Customer service agent (`support.*`, `orders.read.limited`, `customers.read.limited`).
7. `MARKETING_MANAGER`: Campaign, banner, and collection manager (`campaigns.*`, `banners.*`, `collections.*`).
8. `WAREHOUSE_STAFF`: Packing, shipping, and local warehouse stock handler (`orders.pack`, `orders.ship`, `inventory.update.limited`).

---

## 3. Permission Naming & Registry

Permissions follow the standard `resource.action` naming convention in `constants/permissions.ts`:

* Catalog: `products.read`, `products.create`, `products.update`, `products.delete`, `categories.*`
* Inventory: `inventory.read`, `inventory.update`, `warehouses.read`, `stockAdjustments.create`
* Orders: `orders.read`, `orders.update`, `orders.fulfillment`, `orders.pack`, `orders.ship`
* Customers: `customers.read`, `customers.read.limited`, `customers.update`
* Returns & Refunds: `returns.read`, `returns.approve`, `refunds.read`, `refunds.process`
* Marketing: `campaigns.read`, `campaigns.create`, `banners.*`, `collections.*`
* Staff Administration: `staff.read`, `staff.create`, `staff.update`, `staff.roles.manage`
* Settings & Audit: `settings.read`, `settings.update`, `audit.read`

---

## 4. Server-Side Authorization Guards

Located in `lib/auth/rbac.ts`:

* `getEffectivePermissions(staff: IStaff)`: Resolves all role records from MongoDB, handles Super Admin wildcard escalation, and returns a deduplicated array of permissions.
* `requirePermission(permission: Permission)`: Asserts caller is staff with the required permission; throws `InsufficientPermissionError` (403) on failure.
* `requireAnyPermission(permissions: Permission[])`: Asserts caller holds at least one permission in the list.
* `requireAllPermissions(permissions: Permission[])`: Asserts caller holds all permissions in the list.
* `requireRole(role: Role)`: Asserts caller possesses the specified role.

---

## 5. Route & Frontend Isolation

1. **Storefront vs Admin Boundary**:
   * Storefront: `/`, `/shop`, `/product/[slug]`, `/account/*`
   * Admin: `/admin/*`
   * Normal customers attempting to navigate to `/admin` are denied server-side.
2. **Permission-Gated Navigation**:
   * The `AdminSidebar` only renders links to modules for which the current staff member holds the required read permission.
3. **UI Permission Gating**:
   * `<PermissionGate permission="products.update">...</PermissionGate>` handles presentation conditional rendering.
   * UI gating is purely for UX; all server route handlers and actions enforce independent server-side checks.

---

## 6. Resource Ownership (IDOR Protection)

Located in `lib/auth/ownership.ts`:

* `verifyResourceOwnership(authenticatedCustomerId, resourceOwnerId)`: Compares authenticated user ID with the target resource's `customerId`.
* Throws `ResourceAccessDeniedError` (403) on mismatch.
* Ensures Customer A can never access or modify Customer B's orders, addresses, or profile data.
