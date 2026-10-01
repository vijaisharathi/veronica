# VÉRONA — Reviews & Ratings Architecture (Phase 24)

## 1. Executive Summary & Objective

The **VÉRONA Reviews & Ratings System** constitutes the authoritative application layer for garment feedback, verified customer ratings, media-enriched reviews, abuse moderation, rating aggregation, and customer reputation management.

### Architectural Boundary & Phase Placement
- **Phase 3** — Database Architecture: Mongo schemas (`Review`, `ReviewVote`, `ReviewReport`, `ProductRatingAggregate`), compound indexing, and audit logging.
- **Phase 5** — Authorization & RBAC: Permission gates (`REVIEWS_READ`, `REVIEWS_MODERATE`, `REVIEWS_PUBLISH`, `REVIEWS_REJECT`, `REVIEWS_HIDE`, `REVIEWS_RESTORE`, `REVIEWS_REPORTS_READ`, `REVIEWS_REPORTS_MANAGE`, `REVIEWS_MANAGE`).
- **Phase 9** — Product Catalog: Public catalog visibility rules, denormalized average rating and count on `Product` documents.
- **Phase 11** — Product Details (PDP): Storefront reviews summary, star breakdown bars, filter chips, helpful voting, photo lightbox, and review modal.
- **Phase 12** — Garment Variants: Immutable variant snapshots (`color`, `size`) attached to reviews.
- **Phase 13** — Customer Account Foundation: Customer-facing review portal (`/account/reviews`), status badges, and self-service edit/delete.
- **Phase 19** — Order Management: Order fulfillment state validation (`DELIVERED` status required).
- **Phase 22** — Returns & Exchanges: Preserves historical verified purchase relationships even if garments are later returned or exchanged.
- **Phase 23** — Refunds: Financial settlement layer.
- **Phase 24** — Reviews & Ratings: Authoritative domain logic, moderation, aggregation, and API contracts.
- **Phase 25** — Notifications & Communication: Asynchronous event boundary. (Strictly NOT implemented in Phase 24).

---

## 2. Critical Architectural Principles

### 2.1 Anti-Spoofing Verified Purchase Validation
A client payload claiming `verifiedPurchase: true` is strictly ignored and rejected. Verification is independently validated server-side by checking the customer's real, immutable fulfillment history:
```
Customer
   ↓
Delivered Order (status: DELIVERED)
   ↓
Order Item (matching productId & variantId)
   ↓
Verified Purchase Reference (orderId, orderItemId, verifiedAt snapshot)
```

### 2.2 Canonical Review State Machine
Reviews follow a deterministic lifecycle:
```
                ┌──────────────┐
                │   PENDING    │
                └──────┬───────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  ┌──────────────┐            ┌──────────────┐
  │  PUBLISHED   │            │   REJECTED   │
  └──────┬───────┘            └──────┬───────┘
         │                           │
   ┌─────┴─────┐                     │
   ▼           ▼                     │
┌──────────┐ ┌──────────┐            │
│  HIDDEN  │ │ DELETED  │◄───────────┘
└────┬─────┘ └──────────┘ (Terminal)
     │
     ▼ (Restoration)
┌──────────────┐
│  PUBLISHED   │
└──────────────┘
```

- **PENDING**: Initial state upon submission. Awaiting automated or staff moderation. Private to author and admin.
- **PUBLISHED**: Approved and publicly visible. Contributes to product rating aggregates and distribution.
- **REJECTED**: Rejected by moderation staff for policy violation. Private to admin and author.
- **HIDDEN**: Temporarily or permanently removed from public view (e.g. pending dispute or flagged abuse). Immediately removed from aggregates.
- **DELETED**: Soft-deleted by customer or admin. Terminal state. Preserved in database for audit integrity with `deletedAt` timestamp; never contributes to aggregates.

---

## 3. Review Eligibility & Granularity Policies

### 3.1 Eligibility Criteria
A customer is eligible to submit a verified review if and only if:
1. The customer has at least one order containing the product with fulfillment status `DELIVERED`.
2. The customer does NOT already have an active review (`PENDING`, `PUBLISHED`, `HIDDEN`) for this product.
3. Garment returns: If an item is later returned under Phase 22, the original verified purchase relationship remains historically auditable, but duplicate eligibility is prevented.

### 3.2 Granularity Policy
- **One active review per customer + product**: Enforced at the domain layer and backed by a compound unique index `{ customerId: 1, productId: 1, orderItemId: 1 }`.
- If a customer buys the product again across multiple orders, they may edit their existing review rather than proliferating redundant reviews for the same SKU.

---

## 4. Rating Aggregation & Reconciliation Strategy

### 4.1 Rating Scale
- Strictly 1 to 5 integer scale: `1, 2, 3, 4, 5`.
- Floating-point ratings (e.g. `4.5`), zeroes, or out-of-bound numbers are rejected by Zod schema validation.

### 4.2 Aggregates Storage & Denormalization
Aggregates are maintained in the dedicated `ProductRatingAggregate` collection:
- `averageRating`: Rounded to 2 decimal places.
- `totalReviews`: Total count of active `PUBLISHED` reviews.
- `distribution`: Count per star rating `{ 1: N, 2: N, 3: N, 4: N, 5: N }`.

For zero-join storefront card rendering, `averageRating` and `totalReviews` are also denormalized onto the `Product` document (`rating` and `ratingCount`).

### 4.3 Deterministic Drift Reconciliation
An administrative reconciliation endpoint (`POST /api/admin/reviews/reconcile`) runs an atomic MongoDB aggregation pipeline directly across published reviews for a given product:
```typescript
const stats = await ReviewModel.aggregate([
  { $match: { productId, status: ReviewStatus.PUBLISHED } },
  {
    $group: {
      _id: "$productId",
      averageRating: { $avg: "$rating" },
      totalReviews: { $sum: 1 },
      rating1Count: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
      rating2Count: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
      rating3Count: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
      rating4Count: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
      rating5Count: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
    },
  },
]);
```
This guarantees self-healing and 100% mathematical consistency against concurrent mutations or unexpected outages.

---

## 5. Review Media Architecture

- **Upload Flow**: Clients request a cryptographically signed direct upload token from `POST /api/account/reviews/upload-signature`.
- **Cloudinary Integration**: Images are uploaded directly from the browser to Cloudinary into the `verona/reviews` folder with responsive web-ready transformations.
- **Constraints**: Maximum 5 images per review, maximum 5 MB per file, allowed MIME types: `image/jpeg`, `image/png`, `image/webp`. Binary files are never stored in MongoDB.
- **Orphan Cleanup**: If a customer uploads an image but abandons review creation, or if creation fails, the image reference is not linked to any document and can be reconciled via background maintenance.

---

## 6. Helpful Votes & Abuse Prevention

### 6.1 Helpful Voting
- **Concurrency & Idempotency**: Each vote creates a record in `ReviewVote` with a unique index `{ reviewId: 1, customerId: 1 }`.
- **Toggle Action**: Clicking "Helpful" toggles between voted and unvoted.
- **Self-Vote Prohibition**: Authors cannot vote on their own reviews (`CANNOT_VOTE_OWN_REVIEW`).
- **Target Restriction**: Only reviews in `PUBLISHED` status can receive votes.

### 6.2 Abuse Reporting & Moderation
- **Structured Reasons**: `SPAM`, `OFFENSIVE`, `FAKE_REVIEW`, `IRRELEVANT`, `HARASSMENT`, `OTHER`.
- **Deduplication**: One pending report per customer per review. Prevents report flooding.
- **Resolution**: Admin can either:
  1. `HIDE_REVIEW`: Immediately transitions review to `HIDDEN`, deducts its rating from public aggregates, and marks report `RESOLVED`.
  2. `DISMISS_REPORT`: Clears the flag as unfounded while keeping the review live.

---

## 7. Security, Privacy & Anti-IDOR Protections

1. **Anti-IDOR on Customer Operations**:
   - Customer A cannot edit Customer B's review: `review.customerId !== authenticatedCustomerId` returns `403 Forbidden`.
   - Customer A cannot delete Customer B's review.
   - Customer A cannot report or vote using Customer B's credentials.
2. **Customer Privacy Masking**:
   - Public review responses never expose customer email, phone, address, or MongoDB ID.
   - Display names are automatically formatted with the initial of the last name: `Elena R.` or `Aria S.`.
3. **XSS & Injection Protection**:
   - All review titles and comments pass through regex HTML/script stripping before database persistence.
   - React components render text safely via standard DOM text nodes, never using `dangerouslySetInnerHTML`.
4. **Rate Limiting**:
   - Review creation, edits, helpful voting, and report submissions are guarded by rate limiters to prevent bot spam.

---

## 8. SEO Structured Data Integration

Public product pages (`/product/[slug]`) inject Schema.org JSON-LD structured data based **strictly** on real, published review data:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "The VÉRONA Silk Evening Dress",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "12",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```
**Strict Zero Fabrication**: If `ratingCount === 0`, `aggregateRating` is completely omitted from structured data.

---

## 9. API Contracts Summary

### 9.1 Public Endpoints
- `GET /api/products/:slug/reviews` — Paginated list of published reviews with sorting (`newest`, `highest_rating`, `lowest_rating`, `most_helpful`) and star filters.
- `GET /api/products/:slug/reviews/summary` — Public rating aggregate summary, average score, and 1–5 distribution.

### 9.2 Customer Endpoints
- `GET /api/account/reviews` — Customer's submitted reviews with private statuses.
- `GET /api/account/reviews/eligibility?productId=...` — Verifies eligibility against delivered order history.
- `POST /api/account/reviews` — Submits new review with server-side verified purchase validation.
- `PATCH /api/account/reviews/:id` — Edits review rating, title, comment, or media.
- `DELETE /api/account/reviews/:id` — Soft-deletes review (`status = DELETED`).
- `POST /api/account/reviews/:id/helpful` — Idempotently toggles helpful vote.
- `POST /api/account/reviews/:id/report` — Submits structured abuse report.
- `POST /api/account/reviews/upload-signature` — Generates signed direct Cloudinary upload token.

### 9.3 Admin Endpoints
- `GET /api/admin/reviews` — Moderation queue with filters (`status`, `rating`, `search`, `reportedOnly`).
- `GET /api/admin/reviews/:id` — Full review audit detail with customer PII (for authorized staff), reports, and purchase references.
- `POST /api/admin/reviews/:id/publish` — Approves review to `PUBLISHED` and updates aggregates.
- `POST /api/admin/reviews/:id/reject` — Rejects review with structured reason.
- `POST /api/admin/reviews/:id/hide` — Hides review and decrements rating from aggregates.
- `POST /api/admin/reviews/:id/restore` — Restores hidden/rejected review to `PUBLISHED`.
- `POST /api/admin/reviews/reconcile` — Deterministic product rating aggregate reconciliation.
- `GET /api/admin/review-reports` — Lists flagged abuse reports.
- `POST /api/admin/review-reports/:id/resolve` — Resolves report with `HIDE_REVIEW` or `DISMISS_REPORT`.

---

## 10. Audit Logging & Domain Events

### Audit Logging
All state-changing operations create persistent entries in the Phase 3 `AuditLog` collection:
- `REVIEW_SUBMITTED`
- `REVIEW_EDITED`
- `REVIEW_PUBLISHED`
- `REVIEW_REJECTED`
- `REVIEW_HIDDEN`
- `REVIEW_RESTORED`
- `REVIEW_DELETED`
- `REVIEW_REPORTED`
- `REPORT_RESOLVED`

### Phase 25 Event Boundary
Phase 24 emits structured domain events ready for consumption by Phase 25:
- `review.submitted`
- `review.published`
- `review.rejected`
- `review.reported`

Phase 24 **does not** implement email, SMS, push notifications, marketing campaigns, or customer support ticket escalation. All outbound messaging is deferred to Phase 25.
