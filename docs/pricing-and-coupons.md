# VÉRONA — Pricing, Discounts & Coupons Engine (Phase 15)

## 1. Architectural Overview & Single Pricing Authority

The Pricing, Discounts & Coupons Engine serves as the **single authoritative source of truth** for all monetary calculations, promotional campaigns, and coupon validations across the VÉRONA luxury platform.

```
Product Catalog / Variants
          │
          ▼
   Pricing Service
          │
          ├── 1. Base Price Resolution (MRP vs. Selling Price in Minor Units)
          ├── 2. Active Campaign Promotion Evaluation (Product/Category/Collection/Brand Targets)
          ├── 3. Coupon Eligibility & Validation (Code, Window, Min Cart, Per-Customer Limits)
          ├── 4. Stacking Rules & Maximum Cap Enforcement
          └── 5. Floor Boundary Checks (No Negative Lines, Line Discount <= Subtotal)
          │
          ▼
  Authoritative Pricing Breakdown DTO
          │
          ├── Cart Context & Cart View
          ├── Cart Drawer (Mini-Bag)
          ├── Future Checkout Contract (Phase 17)
          └── Storefront Catalog & Search Cards
```

### Strict System Boundaries

* **Phase 15 calculates product & cart pricing.**
* **Phase 17 owns checkout.**
* **Phase 18 owns payments.**
* **Phase 19 owns orders.**
* **Phase 20 owns inventory.**

No pricing logic is ever duplicated in React components, client-side hooks, checkout screens, or ad-hoc API routes.

---

## 2. Money Model & Deterministic Rounding

### Integer Minor Units (`paise` for `INR`)
Floating-point arithmetic for monetary calculations is strictly forbidden to prevent precision drift and financial reconciliation errors.

* All database records, domain objects, and internal state represent currency in **integer minor units** (`paise`):
  $$\text{₹999.00} = 99900\text{ paise}$$
  $$\text{₹1,499.00} = 149900\text{ paise}$$
* Conversion to major units (`minorToMajor(amountMinor)`) occurs solely for user interface presentation.

### Deterministic Rounding Policy
Percentage discount calculations apply standard commercial **half-up rounding** on integer minor units:
$$\text{discountMinor} = \min\left(\text{amountMinor}, \max\left(0, \operatorname{round}\left(\frac{\text{amountMinor} \times \text{boundedPercentage}}{100}\right)\right)\right)$$

### Discount Floor Rule
A discount can never reduce an item line total or the cart grand total below zero:
$$\text{finalLineTotalMinor} = \max\left(0, \text{lineSubtotalMinor} - \text{itemTotalDiscountMinor}\right)$$
$$\text{grandTotalMinor} = \max\left(0, \text{subtotalMinor} - \text{totalDiscountMinor}\right)$$

---

## 3. Authoritative Price Hierarchy

The pricing engine distinguishes clearly between:
1. **MRP (`mrpMinor`)**: Reference manufacturer's suggested retail price for strikethrough comparison.
2. **Base Selling Price (`sellingPriceMinor`)**: Live catalog selling price set on the product variant.
3. **Promotional Discount (`promotionDiscountMinor`)**: Automatic price reductions triggered by active marketing campaigns (`CampaignModel`).
4. **Effective Selling Price (`effectivePriceMinor`)**: Base price minus active promotional discounts.
5. **Coupon Discount (`couponDiscountMinor`)**: Reductions applied via explicit customer coupon code entry (`CouponModel`).
6. **Grand Total (`grandTotalMinor`)**: Final payable item sum after all eligible discounts.

---

## 4. Promotional Discounts & Campaigns

Promotional campaigns (`CampaignModel`) target customers automatically based on current date and catalog taxonomy:

### Targeting Dimensions
* **PRODUCT**: Specific `targetProductIds`
* **CATEGORY**: Specific `targetCategoryIds`
* **COLLECTION**: Specific `targetCollectionIds`
* **BRAND**: Specific `targetBrandIds`
* **STOREWIDE**: Empty target arrays signify global storewide promotions.

### Priority Resolution
Multiple campaigns may match the same product or category. Campaigns are evaluated in descending order of `priority`:
* If two campaigns apply, the campaign with the higher numerical priority takes precedence.
* Ties are resolved deterministically by earliest `startAt` and MongoDB `_id`.

### Active Date Windows & Timezone Policy
All campaign validity windows (`startAt` and `endAt`) are stored and evaluated in **UTC** on the server:
$$\text{Active if: } \text{startAt} \le \text{serverTimeUTC} < \text{endAt}$$
Client device time is never trusted.

---

## 5. Coupon System & Authoritative Validation

Coupons are redeemed through explicit promotional codes entered into the shopping bag.

### Code Normalization
* Codes are strictly normalized using `code.trim().toUpperCase()`.
* Unique index `{ code: 1 }` on `coupons` collection ensures uniqueness.

### Authoritative Server Validation Pipeline (`validateCoupon`)
When a customer attempts to apply a coupon, the server verifies:
1. **Existence**: Coupon exists in database and is not soft-deleted.
2. **Lifecycle Status**: `active === true`.
3. **Date Window**: Current server UTC is between `startAt` and `expiresAt`.
4. **Global Usage Limit**: If `usageLimit` is specified, `usageCount < usageLimit`.
5. **Per-Customer Usage Limit**: Evaluates `CouponUsageModel.countDocuments({ couponId, customerId }) < perCustomerUsageLimit`.
6. **Minimum Cart Value**: Evaluates whether qualifying subtotal $\ge \text{minCartValue}$.
7. **Exclusions**: Evaluates `excludedProductIds` and `excludedCategoryIds`.
8. **Inclusions**: If specific `applicableProductIds`, `applicableCategoryIds`, or `applicableBrandIds` are configured, verifies the cart contains matching items.
9. **Cap Enforcement**: Caps percentage discounts at `maxDiscountAmount`.

### Decoupled Application vs. Redemption
* **Applying to Cart (`POST /api/cart/coupon`)**: Temporarily links coupon to active cart and recalculates totals. It **does not consume** usage limits.
* **Order Redemption (`recordCouponUsage`)**: Executed atomically upon order payment completion in Phase 18/19 via `CouponUsageModel.create` and `$inc: { usageCount: 1 }`. Abandoned carts never burn coupons.

---

## 6. Stacking Rules & Priority

* **Non-Stackable Coupons (`stackable: false`)**:
  When non-stackable, the coupon discount is calculated only across items that do **not** already possess an active campaign promotional discount.
* **Stackable Coupons (`stackable: true`)**:
  Applies proportionally across eligible items on top of active campaign promotional discounts, subject to `maxDiscountAmount`.

---

## 7. Cart Price Recalculation

Cart totals are **never** persisted as static, unverified numbers. Whenever any mutation or retrieval occurs:
* Add item (`POST /api/cart/items`)
* Update quantity (`PATCH /api/cart/items/:id`)
* Remove item (`DELETE /api/cart/items/:id`)
* Fetch cart (`GET /api/cart`)
* Apply coupon (`POST /api/cart/coupon`)
* Remove coupon (`DELETE /api/cart/coupon`)

The pricing engine hydrates live catalog prices for all items in a single batch query (zero $N+1$), recalculates campaign discounts, validates any attached coupon against the new cart state, adjusts totals, and returns the authoritative `PricingBreakdownDTO`.

---

## 8. Role-Based Access Control (RBAC) & Audit Logging

### Granular Permissions
All pricing management is secured using the established Phase 5 RBAC registry:
* `coupons.read` — View coupon details and listings
* `coupons.create` — Create new privilege vouchers
* `coupons.update` — Edit voucher parameters and validity
* `coupons.delete` — Archive vouchers
* `discounts.read` — View promotional campaigns
* `discounts.create` — Author campaigns
* `discounts.update` — Modify active campaigns
* `discounts.delete` — Archive campaigns
* `pricing.read` & `pricing.update` — Catalog pricing management

### Audit Logging
All administrative mutations create an immutable audit record in `AuditLogModel`:
```typescript
{
  actorId: staff._id,
  actorEmail: staff.email,
  actorType: "STAFF",
  action: "CREATE" | "UPDATE" | "DELETE",
  entity: "COUPON" | "CAMPAIGN",
  entityId: id,
  changes: { before, after },
  ipAddress: clientIp,
  createdAt: new Date()
}
```
Sensitive data such as credentials or tokens are never logged.

---

## 9. API Contracts

### Storefront APIs
* `POST /api/cart/coupon`
  * Request: `{ "code": "VERONA20" }`
  * Response: `{ "success": true, "data": CartDTO }`
* `DELETE /api/cart/coupon`
  * Response: `{ "success": true, "data": CartDTO }`

### Admin Management APIs
* `GET    /api/admin/coupons?page=1&limit=20&status=ACTIVE&search=VIP`
* `POST   /api/admin/coupons`
* `GET    /api/admin/coupons/:id`
* `PATCH  /api/admin/coupons/:id`
* `DELETE /api/admin/coupons/:id`
* `GET    /api/admin/campaigns?page=1&limit=20`
* `POST   /api/admin/campaigns`
* `GET    /api/admin/campaigns/:id`
* `PATCH  /api/admin/campaigns/:id`
* `DELETE /api/admin/campaigns/:id`

---

## 10. Future Checkout Contract (Phase 17 Preparation)

When Phase 17 initiates checkout:
1. It requests the authoritative snapshot from `cartService.getCart(identity)`.
2. The pricing breakdown DTO contains:
   * `subtotalMinor`
   * `promotionDiscountMinor`
   * `couponDiscountMinor`
   * `totalDiscountMinor`
   * `grandTotalMinor`
   * `appliedCoupon` snapshot
3. The checkout engine locks this contract before requesting payment authorization in Phase 18.
