# VÉRONA — Wishlist & Recently Viewed System Architecture (Phase 13)

This document specifies the technical architecture, data models, security controls, and integration patterns for the **Wishlist** and **Recently Viewed** systems of the VÉRONA luxury fashion e-commerce platform.

---

## 1. Domain Separation & Identity Model

### 1.1 Wishlist vs. Recently Viewed
The two domains serve distinct customer intents and are kept strictly isolated:

| Dimension | Wishlist | Recently Viewed |
| :--- | :--- | :--- |
| **Intent** | Deliberate, conscious curation for future purchase | Passive behavioral browsing history |
| **Persistence** | Long-lived, customer-managed until explicitly removed | Rolling, time-sensitive (90-day TTL, max 30 items) |
| **Audience** | Authenticated customers only | Authenticated customers + anonymous guest sessions |
| **Collection** | `wishlists` (Phase 3 schema) | `recently_viewed` (Phase 3 schema) |

### 1.2 Identity Level
* **Wishlist Identity**: **Product-Level**. Customers bookmark a garment silhouette rather than a specific color/size SKU. When moving from wishlist to PDP, the customer selects their active size/color variant with live inventory awareness.
* **Recently Viewed Identity**: **Product-Level**. Repeated visits to different variants of the same garment refresh the single canonical product view timestamp rather than creating multiple variant-level entries.

---

## 2. Wishlist Architecture

### 2.1 Schema & Data Model
Reuses the Phase 3 `WishlistSchema` (`WishlistModel`) mapping `customerId` to an array of items:
```ts
Wishlist {
  _id: ObjectId;
  customerId: ObjectId (ref: "Customer", unique);
  items: Array<{
    _id: ObjectId;
    productId: ObjectId (ref: "Product");
    addedAt: Date (default: Date.now);
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Uniqueness & Concurrency
* **Uniqueness**: Enforced via atomic MongoDB `$addToSet` / query filtering matching `{ customerId, "items.productId": productId }`.
* **Idempotency**: Repeated `POST` calls to add the same product are idempotent and return the existing entry without creating duplicates or throwing errors.
* **Ordering**: Wishlist items are sorted deterministically by `addedAt DESC`.

### 2.3 Product Visibility Protection
When retrieving a customer's wishlist:
1. Wishlist records reference canonical product IDs.
2. The service performs batch hydration against the active product catalog using `productService.getProductPreviewsByIds(productIds)`.
3. Any products that have transitioned to `DRAFT`, `ARCHIVED`, or `UNPUBLISHED` are filtered out from the customer view, ensuring private product details never leak.
4. Historical records remain intact in the database unless the customer removes them.

---

## 3. Recently Viewed Architecture

### 3.1 Schema & Data Model
Reuses the Phase 3 `RecentlyViewedSchema` (`RecentlyViewedModel`):
```ts
RecentlyViewed {
  _id: ObjectId;
  customerId?: ObjectId (ref: "Customer", sparse, index);
  sessionId?: string (sparse, index);
  productId: ObjectId (ref: "Product", index);
  viewedAt: Date (default: Date.now);
}
```

### 3.2 Indexing & Automatic Retention
* **Compound Indices**:
  * `{ customerId: 1, productId: 1 }` (unique, sparse)
  * `{ sessionId: 1, productId: 1 }` (unique, sparse)
  * `{ customerId: 1, viewedAt: -1 }`
  * `{ sessionId: 1, viewedAt: -1 }`
* **TTL Index**: `{ viewedAt: 1 }` with `expireAfterSeconds: 7776000` (90 days). Old entries expire automatically at the database engine level.
* **Size Cap**: Capped at `MAX_RECENTLY_VIEWED_LIMIT = 30` items per customer or guest session. Excess items are automatically pruned in the repository on new view insertion.

### 3.3 Genuine View Recording
* Views are recorded only upon successful load of a valid, published storefront product page.
* 404 products, draft silhouettes, prefetch requests, and robot crawlers do not trigger view recording.
* Debouncing on the client and single-fire `useEffect` on `product.id` change prevents multiple records during React re-renders.

---

## 4. Guest Session Strategy

1. **Anonymous Guest Sessions**: Unauthenticated visitors receive a secure, HttpOnly, SameSite `verona_session_id` cookie via `lib/session.ts` (`getViewerIdentity`).
2. **Browsing Persistence**: Guest product views are recorded against `sessionId`, allowing visitors to see their Recently Viewed garments across the session.
3. **Wishlist Policy**: Wishlist curation requires an authenticated customer account. When a guest clicks the wishlist heart, they are redirected to login with a sanitized `returnUrl` (preventing open redirect vulnerabilities via `lib/url.ts`).

---

## 5. API Contracts & Cache Safety

### 5.1 Wishlist Endpoints
* `GET /api/wishlist` — Returns customer's wishlisted products hydrated as `ProductPreview[]`.
* `POST /api/wishlist` — Body `{ productId: string }`. Idempotent addition.
* `DELETE /api/wishlist/:productId` — Removes product from customer's wishlist.
* `DELETE /api/wishlist` — Clears entire customer wishlist.
* `GET /api/wishlist/status?productIds=id1,id2` — Batch status check returning `Record<string, boolean>`.

### 5.2 Recently Viewed Endpoints
* `GET /api/recently-viewed?exclude=[productId]&limit=[n]` — Returns hydrated history sorted by `viewedAt DESC`.
* `POST /api/recently-viewed` — Body `{ productId: string }`. Records view.
* `DELETE /api/recently-viewed` — Clears customer or guest browsing history.
* `DELETE /api/recently-viewed/:productId` — Removes single item from history.

### 5.3 Cache-Control & IDOR Security
* All personalized endpoints send `Cache-Control: private, no-cache, no-store, must-revalidate`.
* Customer identity is resolved strictly from the authenticated server session (`auth.service.ts`), never trusted from client request bodies or query parameters.
* MongoDB `ObjectId` validation via Zod schemas prevents injection attacks.

---

## 6. Performance & Zero N+1 Queries

1. **Batch Hydration**: `productService.getProductPreviewsByIds(productIds)` performs a single `$in` MongoDB query and preserves input ordering in $O(N)$ time.
2. **Batch Wishlist State**: Product cards on catalog, search, and collection pages check wishlist status in a single batch request via `WishlistProvider` or shared context, eliminating N+1 network calls.
3. **Optimistic UI with Rollback**: Heart toggles provide instant visual feedback; if an API call fails or the user is offline, state rolls back automatically.

---

## 7. Future Phase Boundaries
* **Phase 14 (Cart)**: Wishlist items can be transferred to Cart in Phase 14 without modifying Phase 13 contracts.
* **Strict Phase 13 Isolation**: No Cart, Checkout, Inventory deduction, or Review logic is included in Phase 13.
