# VÉRONA Fulfillment & Shipping System Architecture (Phase 21)

## 1. Executive Summary & Boundaries

Phase 21 implements the authoritative, production-ready Fulfillment and Shipping System for VÉRONA. It governs the entire operational lifecycle from order confirmation through warehouse allocation actualization, picking, packing, package aggregation, shipping provider carrier booking, Air Waybill (AWB) generation, multi-carrier event synchronization, webhook ingestion, and live customer tracking.

### Strict Phase Boundaries
- **Phase 20 Owns:**
  - Inventory items, quantity on hand, reservations, receipts, manual adjustments, and warehouse facility entities.
  - Stock was already consumed during order creation/confirmation (`inventoryService.consumeOrderStock()`).
- **Phase 21 Owns:**
  - Fulfillment orders (`Fulfillment`), physical parcel creation (`Package`), carrier shipments (`Shipment`), tracking event ledger (`ShipmentEvent`), and carrier webhook auditing (`ShippingWebhookEvent`).
  - Warehouse pick/pack execution workflows.
  - Shipping provider adapter abstraction (`IShippingProvider`).
  - Webhook signature verification and carrier event idempotency.
  - Shipment reconciliation and customer-facing tracking views.
  - Admin fulfillment management dashboard (`/admin/fulfillment`).
- **Phase 22 Owns (NOT IMPLEMENTED HERE):**
  - Return merchandise authorization (RMA), return pickup, inspection, and garment exchange fulfillment.
- **Phase 23 Owns (NOT IMPLEMENTED HERE):**
  - Financial refunds, payment reversals, and credit notes.

---

## 2. Core Entities & Database Schemas

### 2.1 Fulfillment (`IFulfillment`)
Represents an operational fulfillment order assigned to a specific warehouse facility.
```typescript
interface IFulfillment {
  _id: ObjectId;
  fulfillmentNumber: string; // Unique index (e.g., FUL-M3K9A-7B2)
  orderId: string;
  warehouseId: string;
  status: FulfillmentStatus;
  items: IFulfillmentItem[];
  assignedTo?: string;
  allocatedAt?: Date;
  pickingStartedAt?: Date;
  pickedAt?: Date;
  pickedBy?: string;
  packingStartedAt?: Date;
  packedAt?: Date;
  packedBy?: string;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}
```

### 2.2 Package (`IPackage`)
Represents a physical parcel packed in the warehouse, including precise item composition, gross weight in grams, and volumetric dimensions.
```typescript
interface IPackage {
  _id: ObjectId;
  packageNumber: string; // Unique index (e.g., PKG-M3K9A-8C1)
  fulfillmentId: string;
  orderId: string;
  items: IPackageItem[];
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  status: "CREATED" | "SEALED" | "LABELLED" | "SHIPPED";
}
```

### 2.3 Shipment (`IShipment`)
Represents the carrier booking and logistics consignment for a package.
```typescript
interface IShipment {
  _id: ObjectId;
  shipmentNumber: string; // Unique index (e.g., SHP-M3K9A-9D4)
  orderId: string;
  fulfillmentId: string;
  packageId?: string;
  warehouseId: string;
  provider: string; // E.g., 'MANUAL', 'DELHIVERY', 'BLUEDART'
  providerShipmentId?: string;
  awbNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  serviceLevel?: string; // E.g., 'STANDARD', 'EXPRESS'
  estimatedDeliveryDate?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  idempotencyKey?: string; // Unique sparse index
}
```

### 2.4 ShipmentEvent (`IShipmentEvent`)
Immutable audit log recording every checkpoint or status update in a shipment's transit.
```typescript
interface IShipmentEvent {
  _id: ObjectId;
  shipmentId: string;
  status: ShipmentStatus;
  providerStatus?: string;
  location?: string;
  description: string;
  eventTime: Date;
  source: ShipmentEventSource; // 'SYSTEM', 'ADMIN', 'WAREHOUSE', 'PROVIDER', 'WEBHOOK', 'RECONCILIATION'
  providerEventId?: string;
  rawReference?: Record<string, unknown>;
}
```

### 2.5 ShippingWebhookEvent (`IShippingWebhookEvent`)
Audit table ensuring carrier notifications are ingested once and only once with cryptographic verification.
```typescript
interface IShippingWebhookEvent {
  _id: ObjectId;
  provider: string;
  eventId: string; // Compound index with provider
  eventType: string;
  shipmentId?: string;
  providerShipmentId?: string;
  awbNumber?: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "PROCESSED" | "FAILED" | "DUPLICATE";
  receivedAt: Date;
  processedAt?: Date;
  error?: string;
}
```

---

## 3. State Machines & Validation

### 3.1 Fulfillment Lifecycle Transitions
```
PENDING ──> READY_FOR_FULFILLMENT ──> ALLOCATED ──> PICKING ──> PICKED ──> PACKING ──> PACKED ──> SHIPMENT_CREATED ──> COMPLETED
  │                 │                     │           │                     │                                         
  └─────────────────┴─────────────────────┴───────────┼─────────────────────┴──> FAILED                               
                    │                                 │
                    └──> CANCELLED                    └──> (Non-cancellable once picking begins)
```
- **Cancellable States:** Only `PENDING`, `READY_FOR_FULFILLMENT`, and `ALLOCATED`. Once a warehouse employee begins physical picking, cancellation is strictly forbidden.
- **Terminal States:** `COMPLETED`, `CANCELLED`, `FAILED`.

### 3.2 Shipment Lifecycle Transitions
```
CREATED ──> LABEL_CREATED ──> READY_FOR_PICKUP ──> PICKED_UP ──> IN_TRANSIT ──> OUT_FOR_DELIVERY ──> DELIVERED (Terminal)
  │               │                   │                                 │               │
  └───────────────┴───────────────────┴──> CANCELLED (Terminal)         └──> FAILED ────┤
                                                                                        └──> RTO_INITIATED ──> RTO_IN_TRANSIT ──> RTO_DELIVERED (Terminal)
```

---

## 4. Shipping Provider Abstraction

### 4.1 Interface Contract
All carrier adapters must implement `IShippingProvider`:
```typescript
export interface IShippingProvider {
  readonly name: string;
  readonly capabilities: ShippingProviderCapabilities;

  createShipment(request: CreateShipmentProviderRequest): Promise<CreateShipmentProviderResponse>;
  trackShipment(awbNumber: string): Promise<TrackShipmentProviderResponse>;
  cancelShipment(providerShipmentId: string): Promise<{ success: boolean; error?: string }>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
}
```

### 4.2 ManualShippingProvider
The system includes `ManualShippingProvider` as the reference default. It never fabricates fake AWBs, fake delivery URLs, or synthetic events. It books internal warehouse deliveries and relies on explicit staff checkpoint confirmation or configured external providers.

---

## 5. Warehouse Pick & Pack Operations

1. **Start Picking (`POST /api/admin/fulfillment/[id]/start-picking`):**
   - Validates transition `ALLOCATED -> PICKING`.
   - Records warehouse staff actor and `pickingStartedAt` timestamp.
2. **Confirm Pick (`POST /api/admin/fulfillment/[id]/confirm-pick`):**
   - Enforces strict quantity bounds: `pickedQuantity <= orderedQuantity`. Over-picking is impossible.
   - Updates `fulfilledQuantity` on each item.
   - Transitions fulfillment to `PICKED`.
3. **Start Packing (`POST /api/admin/fulfillment/[id]/start-packing`):**
   - Transitions fulfillment to `PACKING`.
4. **Create Package (`POST /api/admin/fulfillment/[id]/packages`):**
   - Validates garments assigned to the package belong to the fulfillment.
   - Records gross weight in grams and parcel dimensions.
5. **Confirm Pack (`POST /api/admin/fulfillment/[id]/confirm-pack`):**
   - Ensures at least one package exists.
   - Seals all created packages (`status: 'SEALED'`).
   - Transitions fulfillment to `PACKED`.
   - Synchronizes order status to `PACKED` via `OrderService.updateOrderStatusAsAdmin()`.

---

## 6. Carrier Booking & Shipment Creation

- **Endpoint:** `POST /api/admin/fulfillment/[id]/shipments`
- **Idempotency:** Accepts optional `Idempotency-Key` header or payload field. Guarantees that duplicate requests return the existing shipment without re-booking the carrier or generating multiple AWBs.
- **Provider Resolution:** Active provider resolved dynamically via `process.env.SHIPPING_PROVIDER` or explicit selection.
- **State Cascade:**
  - Package marked `LABELLED`.
  - Fulfillment marked `SHIPMENT_CREATED`.
  - Order assigned `shipmentId`.

---

## 7. Carrier Webhooks & Idempotency

- **Endpoint:** `POST /api/webhooks/shipping`
- **Signature Verification:** The carrier-specific cryptographic HMAC signature is validated against the raw, unparsed request payload before any processing occurs.
- **Event Deduplication:** The pair `(provider, eventId)` is checked against `ShippingWebhookEventModel`. Duplicate deliveries return `{ success: true, duplicate: true }` without modifying shipments.
- **Event Dispatch:** Canonical status normalization maps provider codes (e.g., `in_transit`, `dispatched`, `delivered`) to internal `ShipmentStatus` and appends an immutable `ShipmentEvent`.

---

## 8. Customer Live Tracking

- **Endpoint:** `GET /api/orders/[orderNumber]/tracking`
- **Security & Anti-IDOR:** Validates customer session server-side. Customers can only track their own orders.
- **SEO Protection:** Tracking pages include `robots: { index: false, follow: false }`.
- **Checkpoint Stepper:**
  - Displays chronological progress: `Order Packed & Label Created` -> `Picked Up by Carrier` -> `In Transit` -> `Out for Delivery` -> `Delivered`.
  - Lists individual items contained in each consignment package.
  - Links directly to carrier tracking portals when AWB/tracking URLs are available.

---

## 9. Security & Warehouse-Scoped RBAC

| Permission | Description | Assigned Roles |
| :--- | :--- | :--- |
| `FULFILLMENT_READ` | View fulfillment orders, items, and packages | Super Admin, Order Manager, Warehouse Staff |
| `FULFILLMENT_ALLOCATE`| Create fulfillment and assign to warehouse | Super Admin, Order Manager |
| `FULFILLMENT_PICK` | Start picking and confirm picked garment items | Super Admin, Order Manager, Warehouse Staff |
| `FULFILLMENT_PACK` | Start packing, create packages, confirm pack | Super Admin, Order Manager, Warehouse Staff |
| `FULFILLMENT_MANAGE` | Full fulfillment control and cancellation | Super Admin, Order Manager |
| `SHIPMENTS_CREATE` | Book carrier shipments and generate labels | Super Admin, Order Manager |
| `SHIPMENTS_TRACK` | View shipments and tracking checkpoints | Super Admin, Order Manager, Warehouse Staff |
| `SHIPMENTS_RECONCILE`| Trigger active carrier API tracking sync | Super Admin, Order Manager |
| `SHIPMENTS_MANAGE` | Manual event entry and carrier configuration | Super Admin, Order Manager |

**Warehouse Scope Enforcement:**
If a warehouse staff member has an `assignedWarehouseId`, server-side validation strictly prevents them from viewing, picking, packing, or booking shipments for any other warehouse facility (`AuthorizationError: Warehouse scope violation`).
