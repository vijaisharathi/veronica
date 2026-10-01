# VÉRONA Inventory & Warehouse Management Architecture (Phase 20)

## 1. Executive Summary & Boundaries

Phase 20 implements the authoritative, production-grade Inventory and Warehouse Management System for VÉRONA. It governs physical fulfillment centers, variant-level stock tracking, atomic stock reservations, structured append-only movements, warehouse allocation algorithms, and integration with checkout and orders.

### Strict Phase Boundaries
- **Phase 20 Owns:**
  - Warehouses (configuration, statuses, unique facility codes).
  - Inventory items & variant-level stock metrics (`quantityOnHand`, `quantityReserved`, derived `availableQuantity`).
  - Stock reservations, atomic concurrency controls, TTL expiry, release, and order consumption.
  - Append-only stock movement audit log (`StockMovement`).
  - Structured stock intake (`RECEIPT`) and manual adjustments (`ADJUSTMENT_IN`, `ADJUSTMENT_OUT`) with mandatory reasons.
  - Warehouse allocation engine (deterministic multi-item order fulfillment routing).
  - Customer variant availability matrices (color × size grids without revealing exact units).
  - Administrative management UI (`/admin/inventory`, `/admin/warehouses`).
  - Warehouse-scoped server-side RBAC protection.
- **Phase 21 Owns (NOT IMPLEMENTED HERE):**
  - Fulfillment orchestration, shipment creation, courier assignment, tracking numbers, and shipping labels.
- **Phase 22 Owns (NOT IMPLEMENTED HERE):**
  - Return merchandise authorization (RMA) and exchange processing.
- **Phase 23 Owns (NOT IMPLEMENTED HERE):**
  - Financial refunds and payment reversals.

---

## 2. Warehouse Architecture

### 2.1 Schema & Facility Uniqueness
Warehouses represent physical fulfillment nodes distributed across operating geographies.
```typescript
interface IWarehouse {
  _id: ObjectId;
  code: string;        // E.g., 'CHN-01', 'BLR-01', 'MUM-01' (Unique index)
  name: string;        // E.g., 'Chennai Central Fulfillment Center'
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  status: WarehouseStatus; // ACTIVE, INACTIVE, MAINTENANCE, ARCHIVED
  createdAt: Date;
  updatedAt: Date;
}
```
**Database Constraints:**
- `code` is strictly unique at the database level (`{ unique: true }`).
- Status defaults to `ACTIVE`. Only warehouses with status `ACTIVE` can be considered for new stock allocations or reservations.

---

## 3. Variant-Level Inventory Model

Garments require SKU-level tracking governed by Color and Size combinations. VÉRONA never maintains stock solely at the product level.

```
Product (e.g., Silk Evening Gown)
  └── Variant (SKU: GOWN-BLK-S)  ──> Warehouse CHN-01: OnHand: 15, Reserved: 2 (Avail: 13)
  └── Variant (SKU: GOWN-BLK-M)  ──> Warehouse BLR-01: OnHand: 20, Reserved: 0 (Avail: 20)
  └── Variant (SKU: GOWN-WHT-L)  ──> Warehouse MUM-01: OnHand: 5,  Reserved: 5 (Avail: 0)
```

### 3.1 Data Model
```typescript
interface IInventoryItem {
  _id: ObjectId;
  warehouseId: ObjectId;
  productId: ObjectId;
  variantId: string;
  sku: string;
  quantityOnHand: number;      // Physical stock inside the warehouse
  quantityReserved: number;    // Stock locked in active checkout reservations
  lowStockThreshold: number;   // E.g., 5 units for triggering low-stock indicators
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Authoritative Quantity Invariants
All operations maintain mathematical consistency:
$$\text{availableQuantity} = \text{quantityOnHand} - \text{quantityReserved}$$

The system enforces four non-negotiable invariants:
1. `quantityOnHand >= 0` (Cannot have negative physical stock).
2. `quantityReserved >= 0` (Cannot reserve negative units).
3. `quantityReserved <= quantityOnHand` (Cannot reserve more units than are physically on hand).
4. `availableQuantity >= 0` (Available stock can never drop below zero).

Any operation violating these invariants triggers a database precondition failure or Mongoose schema validation rejection.

### 3.3 Compound Uniqueness
A single fulfillment center has at most one inventory record per variant:
- Unique Compound Index: `{ warehouseId: 1, variantId: 1 }`

---

## 4. Stock Movements & Immutability

Every mutation that affects physical stock or reservations produces an immutable, append-only `StockMovement` entry for accounting and forensic auditability.

### 4.1 Movement Types
- `RECEIPT`: Goods received from manufacturing or vendor into warehouse (+OnHand).
- `ADJUSTMENT_IN`: Discrepancy adjustment upward (+OnHand).
- `ADJUSTMENT_OUT`: Discrepancy adjustment downward (-OnHand).
- `RESERVATION`: Temporary stock lock for customer checkout (+Reserved).
- `RELEASE`: Rollback of expired, cancelled, or failed checkout reservation (-Reserved).
- `SALE`: Finalized conversion upon payment capture (-OnHand, -Reserved).
- `TRANSFER_OUT` / `TRANSFER_IN`: Paired movement records across facilities.
- `LOSS` / `DAMAGE`: Damaged or lost items written off (-OnHand).

### 4.2 Append-Only Guarantee
Stock movement records are strictly immutable:
- No update (`findOneAndUpdate`, `updateOne`) or delete operations are permitted on `StockMovement`.
- Corrections must be issued as new offset movements (e.g., `ADJUSTMENT_IN` with reason `CORRECTION`).

---

## 5. Stock Reservation Lifecycle

VÉRONA implements an atomic, short-lived reservation pattern protecting against overselling during checkout bursts.

```
       [ Customer Begins Checkout ]
                     ↓
         Validate Available Stock
                     ↓
       Atomic Mongo Reservation ($inc) ──[Insufficient Stock]──> Blocked / 409 Conflict
                     ↓
       StockReservation (Status: ACTIVE, TTL: 15 mins)
                     ↓
         [ Payment Processing ]
            /                \
   (Success)                  (Failure / Abandonment / Expiry)
      ↓                                      ↓
  Order Created                      Release Reservation ($inc)
      ↓                                      ↓
  Stock Consumed                     StockReservation: RELEASED/EXPIRED
  StockReservation: CONSUMED         Movement: RELEASE
  Movement: SALE
```

### 5.1 Reservation States
- `ACTIVE`: Locked during checkout/payment window.
- `RELEASED`: Manually or programmatically released following cart abandonment, payment decline, or order cancellation.
- `CONSUMED`: Finalized upon order creation; physical inventory deducted.
- `EXPIRED`: Cleaned up by worker when timestamp passes `expiresAt`.
- `CANCELLED`: Voided by customer action before expiration.

### 5.2 Concurrency Protection & Zero Overselling
To prevent race conditions when two customers attempt to buy the last available item simultaneously, reservations use atomic MongoDB updates with strict `$expr` / `$gte` preconditions:

```typescript
const updatedItem = await InventoryItemModel.findOneAndUpdate(
  {
    warehouseId,
    variantId,
    $expr: {
      $gte: [
        { $subtract: ["$quantityOnHand", "$quantityReserved"] },
        requestedQuantity
      ]
    }
  },
  {
    $inc: { quantityReserved: requestedQuantity }
  },
  { new: true }
);

if (!updatedItem) {
  throw new ConflictError("INSUFFICIENT_STOCK");
}
```
This guarantees serializability at the document level without distributed locking overhead.

### 5.3 Automated TTL Expiry & Reconciliation
Active reservations specify an `expiresAt` timestamp (default: 15 minutes).
A background maintenance process (`ReservationService.cleanupExpiredReservations` or `POST /api/admin/inventory/reservations/cleanup`) scans for:
- `status: ACTIVE` AND `expiresAt < now()`
- Atomically decrements `quantityReserved`
- Transitions reservation to `EXPIRED`
- Emits a `RELEASE` stock movement with reason `RESERVATION_EXPIRED`
- Execution is strictly idempotent: re-processing an expired reservation is a no-op.

---

## 6. Warehouse Allocation Foundation

The `WarehouseAllocationService` evaluates cart items against active fulfillment facilities.

### 6.1 Deterministic Selection Strategy
1. **Single-Facility Priority**: Evaluates whether any single active warehouse has sufficient available stock for *all* items in the order. If yes, that warehouse is selected to minimize logistics complexity and packaging waste.
2. **Multi-Facility Fallback**: If no single warehouse can satisfy the complete basket, the allocator selects the optimal active warehouse per variant with largest available on-hand stock.
3. **Availability Failure**: If any variant cannot be fulfilled in its requested quantity across all active warehouses, the allocator aborts with `INVENTORY_UNAVAILABLE`.

*Note: Phase 20 establishes this allocation matrix. Phase 21 will execute physical split shipments when multi-warehouse allocations occur.*

---

## 7. Customer Storefront & Cart Integration

### 7.1 Variant Availability Matrix
Product display pages query variant stock through `/api/products/[slug]/inventory`. To preserve commercial privacy and prevent scraping:
- Exact warehouse quantities are never leaked to customers.
- Customers receive high-level status descriptors:
  - `In Stock` (Available > lowStockThreshold)
  - `Only a few left` (0 < Available <= lowStockThreshold)
  - `Out of Stock` (Available <= 0)
- In the garment size-by-color matrix, unavailable combinations disable selection and prevent "Add to Bag".

### 7.2 Cart & Checkout Availability Checks
- When items are added or quantities incremented in Cart, stock availability is re-verified.
- During Checkout initiation, pre-flight allocation checks ensure all items remain in stock before redirecting to Razorpay payment.

---

## 8. Order Lifecycle Integration (Phase 19 ↔ Phase 20)

### 8.1 Stock Consumption on Payment Success
When Razorpay webhooks or client verification confirms payment in `OrderService.createOrderFromPayment`:
- Order items are assigned to active fulfillment facilities via `WarehouseAllocationService`.
- `InventoryService.consumeOrderStock()` atomically decrements `quantityOnHand` and records a `SALE` movement.
- Order records store the `allocatedWarehouseId` for downstream fulfillment.

### 8.2 Stock Restoration on Order Cancellation
When an order is cancelled prior to shipment:
- `InventoryService.restoreOrderStock()` atomically increments `quantityOnHand` and records an `ADJUSTMENT_IN` movement with reason `ORDER_CANCELLED`.
- Restoration is idempotent and tracks order ID references to prevent duplicate refunds/restorations.

---

## 9. Security & Role-Based Access Control (RBAC)

Inventory operations enforce Phase 5 RBAC with warehouse-scoped authorization:

| Role | Permissions | Scope |
| :--- | :--- | :--- |
| **Super Admin** | `inventory.manage`, `warehouses.manage`, etc. | Global (All facilities) |
| **Inventory Manager** | `inventory.receive`, `inventory.adjust`, `inventory.read` | Global |
| **Warehouse Staff** | `inventory.receive`, `inventory.adjust` (restricted) | **Scoped** (`assignedWarehouseId` only) |
| **Customer** | Public availability checks only | No direct inventory mutation |

### 9.1 Server-Side Warehouse Scope Verification
If a staff user has an `assignedWarehouseId`, any intake (`/receive`) or count adjustment (`/adjust`) targeting a different facility is rejected with a `403 Forbidden` (`AuthorizationError`), blocking horizontal privilege escalation (IDOR).

---

## 10. Database Indexes & Performance Optimization

```typescript
// Inventory items
InventoryItemSchema.index({ warehouseId: 1, variantId: 1 }, { unique: true });
InventoryItemSchema.index({ variantId: 1 });
InventoryItemSchema.index({ productId: 1 });
InventoryItemSchema.index({ sku: 1 });

// Stock reservations
StockReservationSchema.index({ reservationId: 1 }, { unique: true });
StockReservationSchema.index({ status: 1, expiresAt: 1 });
StockReservationSchema.index({ referenceId: 1 });
StockReservationSchema.index({ warehouseId: 1, variantId: 1 });

// Stock movements
StockMovementSchema.index({ warehouseId: 1, createdAt: -1 });
StockMovementSchema.index({ variantId: 1, createdAt: -1 });
StockMovementSchema.index({ referenceId: 1 });

// Warehouses
WarehouseSchema.index({ code: 1 }, { unique: true });
WarehouseSchema.index({ status: 1 });
```

### Batch Availability & N+1 Prevention
Storefront listings and cart validations use `InventoryRepository.getBatchVariantStock()`, passing an array of `variantIds` in a single `$in` query with aggregation projection, preventing N+1 database queries.
