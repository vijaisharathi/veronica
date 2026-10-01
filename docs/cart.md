# VÉRONA — Cart System Documentation (Phase 14)

## 1. Overview & Architecture

The **Cart System** in VÉRONA provides a high-performance, resilient, and secure shopping bag experience for luxury fashion garments. It adheres strictly to VÉRONA's modular monolith architecture and ensures zero data loss, strict variant validation, and monetary precision.

### Architecture Flow

```text
UI (CartView, CartDrawer, StorefrontHeader, ProductDetailView)
   ↓ React Context / useCart hook (optimistic rollback, offline awareness)
API Routes (app/api/cart/*)
   ↓ Zod Validation & Viewer Identity Resolution (lib/session, lib/auth/session)
CartService (modules/cart/cart.service.ts)
   ↓ Strict Variant Resolution & Live Pricing Resolution
CartRepository (db/repositories/cart.repository.ts)
   ↓ MongoDB Models (CartModel, CartItemModel)
MongoDB Database
```

---

## 2. Cart & CartItem Schema Reuse

The implementation reuses the canonical Phase 3 schema without creating competing models:

### `ICart` (`db/models/cart.model.ts`)
* `_id`: ObjectId
* `customerId`: Optional ObjectId (indexed) for authenticated customers
* `sessionId`: Optional string (indexed) for anonymous guest sessions
* `status`: `CartStatus.ACTIVE` | `CartStatus.CONVERTED` | `CartStatus.ABANDONED`
* `currency`: `"INR"`
* `subtotal`: `MinorUnits` (paise)
* `total`: `MinorUnits` (paise)
* `createdAt`: Date
* `updatedAt`: Date

### `ICartItem` (`db/models/cart.model.ts`)
* `_id`: ObjectId
* `cartId`: ObjectId (foreign key to `Cart`, indexed)
* `productId`: ObjectId (foreign key to `Product`)
* `variantId`: ObjectId (foreign key to `ProductVariant`)
* `quantity`: Integer (1 to 10)
* `unitPriceSnapshot`: `MinorUnits` (recorded at time of item insertion)
* `productNameSnapshot`: String
* `variantSnapshot`: `{ color, size, sku }`
* `imageSnapshot`: String
* `createdAt`: Date
* `updatedAt`: Date

---

## 3. Cart Item Identity & Uniqueness

A cart item is uniquely identified by the tuple:
```text
cartId + productId + variantId
```

* **No duplicate lines**: Adding the same variant (same color and size) twice increments the quantity of the existing line item rather than creating a duplicate entry.
* **Distinct variants remain separate**: Black / M and Black / L exist as distinct line items.

---

## 4. Variant & Catalog Validation

Every addition to the cart is verified server-side against authoritative catalog models:
1. **Product Status**: Product must exist, not be soft-deleted, have `status: PUBLISHED`, and `visibility: PUBLIC`.
2. **Variant Status**: Variant must exist, belong to the product, have `status: ACTIVE`, and `active: true`.
3. **Availability**: Live catalog availability is verified. Out-of-stock garments are rejected with a `ConflictError` (`409`).
4. **Untrusted Client**: The client is never trusted for price, brand name, variant color, size, or availability.

---

## 5. Quantity Rules

* **Integer Only**: Reject floats, decimals, NaNs, strings, and negative values.
* **Minimum**: `MIN_CART_ITEM_QUANTITY = 1`.
* **Maximum**: Centralized `MAX_CART_ITEM_QUANTITY = 10` (configured in `config/cart.ts`).
* **Zero Quantity Behavior**: Setting `quantity: 0` via `PATCH /api/cart/items/:itemId` cleanly removes the item from the shopping bag.

---

## 6. Monetary Precision & Subtotal Calculation

* All currency calculations are executed in **integer minor units** (paise for INR):
  $$\text{LineTotal}_{\text{minor}} = \text{UnitPrice}_{\text{minor}} \times \text{Quantity}$$
  $$\text{Subtotal}_{\text{minor}} = \sum \text{LineTotal}_{\text{minor}}$$
* Floating-point arithmetic is strictly avoided to eliminate fractional rounding discrepancies.
* Currency is fixed to `"INR"`.

---

## 7. Dynamic Price Change Detection

When hydrating or mutating a cart:
1. The service looks up the current `sellingPrice` from `ProductVariantModel`.
2. If `currentSellingPrice !== item.unitPriceSnapshot`:
   * `priceChanged: true` is flagged on the DTO.
   * `previousPriceMinor` contains the snapshot price.
   * `unitPriceMinor` and `lineTotalMinor` reflect the current catalog price.
   * Subtotal is calculated from the live catalog price, preventing customers from checking out with stale cached prices.
   * The UI displays an amber notification alerting the customer to the price change.

---

## 8. Stale & Unavailable Cart Handling

If a customer returns to an existing cart after a product or variant has been updated:
* If the product was archived, unpublished, or deleted: `availability = "PRODUCT_UNAVAILABLE"`.
* If the variant was deactivated: `availability = "VARIANT_UNAVAILABLE"`.
* If the variant is temporarily unavailable: `availability = "OUT_OF_STOCK"`.
* The cart does not crash or silently delete items; it marks the item state clearly with badges and warnings in `CartView` and `CartDrawer`.

---

## 9. Performance & Zero N+1 Hydration

Cart hydration uses batch queries:
* Single query to fetch cart items: `find({ cartId })`.
* Batch fetch products: `ProductModel.find({ _id: { $in: productIds } })`.
* Batch fetch variants: `ProductVariantModel.find({ _id: { $in: variantIds } })`.
* Batch fetch brands: `BrandModel.find({ _id: { $in: brandIds } })`.
* All operations scale in $O(1)$ round-trips regardless of the number of items in the cart.

---

## 10. Guest Cart & Authentication Merge Strategy

1. **Guest Browsers**: Anonymous users receive a secure `verona_session_id` HTTP-only cookie.
2. **Server-Side Persistence**: Guest carts are stored directly in MongoDB linked via `sessionId`.
3. **Automated Merge on Login**:
   * When an authenticated customer accesses the cart with an active guest cookie, `cartService.mergeGuestCart(customerId, guestSessionId)` executes atomically.
   * Identical variants merge quantities (capped at `MAX_CART_ITEM_QUANTITY = 10`).
   * Unique guest variants are reassigned to the customer's cart.
   * The guest cart status is marked `CONVERTED` and the session cookie is deleted.

---

## 11. Wishlist Integration

* Customers can click **"Save to Wishlist"** on any cart line item.
* Requires customer authentication.
* Uses the canonical `wishlistService.addToWishlist(customerId, productId)`.
* Removes the item from the cart **only after** the wishlist operation succeeds, ensuring no items are lost if an error occurs.

---

## 12. Security & Anti-IDOR Protections

* **Server Authoritative Ownership**: All item mutations (`PATCH`, `DELETE`, `move-to-wishlist`) verify that the targeted `itemId` belongs to the active cart owned by the requesting customer or session.
* **No Client Trust**: Client cannot submit customer IDs, prices, or cart totals.
* **Private Cache Headers**: All cart API responses and pages enforce:
  `Cache-Control: private, no-cache, no-store, must-revalidate`

---

## 13. API Contracts

### `GET /api/cart`
* **Response**: `200 OK` with `CartDTO`.

### `POST /api/cart/items`
* **Body**: `{ "productId": string, "variantId": string, "quantity": number }`
* **Response**: `201 Created` with updated `CartDTO`.

### `PATCH /api/cart/items/:itemId`
* **Body**: `{ "quantity": number }`
* **Response**: `200 OK` with updated `CartDTO` (removes if quantity is 0).

### `DELETE /api/cart/items/:itemId`
* **Response**: `200 OK` with updated `CartDTO`.

### `DELETE /api/cart`
* **Response**: `200 OK` with empty `CartDTO`.

### `POST /api/cart/items/:itemId/move-to-wishlist`
* **Response**: `200 OK` with updated `CartDTO` (requires customer auth).

### `GET /api/cart/count`
* **Response**: `200 OK` with `{ itemCount: number }`.

---

## 14. Phase Boundaries (Explicit Disclaimers)

The following capabilities are **explicitly not managed** in Phase 14:
* **Coupons & Promotional Discounts**: Handled in Phase 15.
* **Dynamic Tax & Shipping Calculations**: Handled in Phase 15 / Phase 16.
* **Checkout & Address Selection**: Handled in Phase 17.
* **Payment Processing**: Handled in Phase 18.
* **Orders & Order State Machine**: Handled in Phase 19.
* **Warehouse Stock Reservation & Deductions**: Handled in Phase 20.
