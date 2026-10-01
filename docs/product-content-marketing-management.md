# VÉRONA — Product, Content & Marketing Management System (Phase 28)

## 1. Executive Summary & Architectural Scope

The **Product, Content & Marketing Management System (Phase 28)** serves as the administrative orchestration layer over VÉRONA's domain engines. It enables authorized merchandising, catalog, and marketing personnel to configure luxury garments, categorize collections, schedule promotional events, publish editorial journalism, and organize homepage layouts without direct database access or code modifications.

### Domain Authority & Boundaries
- **Phase 08 (Category & Collection System)**: Hierarchy trees, parent-child taxonomy, and capsule definitions.
- **Phase 09 (Product Catalog)**: Canonical product catalog schema, attributes, and public discovery queries.
- **Phase 12 (Garment Variant & Size System)**: Matrix modeling ($Color \times Size \to SKU$), visual swatches, and size ordering.
- **Phase 15 (Pricing, Discounts & Coupons)**: Canonical pricing calculations, coupon redemption, and discount eligibility authority. Phase 28 orchestrates promotional campaign rules but **never duplicates pricing logic**.
- **Phase 20 (Inventory & Warehouse Management)**: Warehouse stock levels, reservations, adjustments, and allocations. Phase 28 only references available inventory metrics.
- **Phase 25 (Notifications & Communication)**: Notification dispatch pipelines. Phase 28 emits domain events but **never communicates directly with email/SMS gateways**.
- **Phase 27 (Admin & Operations Dashboard)**: Operational cockpit, centralized KPIs, alerts, and navigation shell.
- **Phase 28 (Product, Content & Marketing Management)**: Administrative CRUD, lifecycle state machines, scheduling windows, targeting rules, media validation, and content auditing.
- **Phase 29 (Customer, Staff & Platform Administration)**: Customer profiles, staff account administration, and platform settings (**Strictly Not Started**).

---

## 2. Product Management & Lifecycle Architecture

### 2.1 Canonical Lifecycle States
Products transition through explicit states:
1. **DRAFT**: Newly created or unpublished. Not discoverable in public storefront searches or category listings. Can only be previewed via authenticated staff routes (`/api/admin/products/:id/preview`).
2. **PUBLISHED**: Active and publicly discoverable. Requires all invariants to be satisfied.
3. **ARCHIVED**: Soft-deleted. Hidden from storefront discovery but retained indefinitely to protect historical referential integrity (orders, reviews, audit logs).

### 2.2 Publishing Invariants
Before a product can transition to `PUBLISHED`, `AdminCatalogService.publishProduct()` strictly validates:
1. **Classification**: At least one valid category and brand must be assigned.
2. **Media**: At least one gallery image must be present, with exactly one primary image.
3. **Variants**: At least one active variant must exist.
4. **Pricing Reference**: Every active variant must possess a selling price $> 0$ in minor currency units (INR Paise).

### 2.3 Slug Management & Uniqueness
Slugs are normalized to lowercase alphanumeric hyphen-delimited strings (`normalizeSlug()`). Slug collisions are checked against existing active records using indexed queries, preventing URL hijacking or overwritten routes.

### 2.4 Garment Attributes
Structured attributes supported:
- **Fabric**: e.g., 100% Mulberry Silk, Cashmere Blend, Giza Cotton
- **Pattern**: Solid, Pinstripe, Houndstooth, Floral
- **Fit**: Tailored Slim, Regular, Relaxed, Oversized
- **Neck**: Spread Collar, Mandarin, Crew Neck, V-Neck
- **Sleeve**: Long Sleeve, Half Sleeve, Sleeveless
- **Occasion**: Evening Gala, Business Formal, Luxury Casual
- **Care Instructions**: Formatted array of maintenance guidelines

---

## 3. Product Media & Gallery Strategy

### 3.1 Media Validation
`MediaService` enforces:
- **HTTPS Only**: Rejects unencrypted protocols.
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
- **File Size Cap**: Maximum 5 MB per asset.
- **Alt Text Integrity**: Accessibility-focused descriptions capped at 200 characters. Keyword stuffing is discouraged.
- **Single Primary**: A product gallery must designate exactly one primary image for card rendering.

### 3.2 Storage Independence
Large binary blobs are never stored directly in MongoDB. Media records store HTTPS CDN references (Cloudinary / S3).

---

## 4. Category & Collection Management

### 4.1 Hierarchy & Cycle Prevention
The category tree supports multi-level nesting while guaranteeing acyclic integrity:
- **Self-Parenting**: A category cannot specify its own `_id` as `parentId`.
- **Cycle Prevention**: Traversal up the ancestor chain ensures that a descendant category cannot become an ancestor of its parent.
- **Reference Guard**: Archiving a category is rejected if active products are linked to it.
- **Sequential Ordering**: `reorderCategories()` writes consecutive `sortOrder` values via bulk operations.

### 4.2 Collections
- Supports seasonal capsules (e.g., "Winter Atelier 2026").
- Date scheduling windows (`startDate` and `endDate`) evaluate active status.
- Product membership is mapped via persistent product IDs.

---

## 5. Brand Administration

- Brands maintain display names, normalized slugs, logo URLs, and official websites.
- **Referential Protection**: Archiving a brand throws `ConflictError` if published products are assigned to it.

---

## 6. Content Management Hub

### 6.1 Homepage Modular Sections
- Supports ordering and toggling visibility for:
  - `HERO`
  - `CATEGORY_GRID`
  - `PRODUCT_CAROUSEL`
  - `COLLECTION_FEATURE`
  - `EDITORIAL`
  - `PROMOTION`
  - `TRUST`
  - `NEWSLETTER`
- Auto-seeds standard default sections if the collection is empty.
- Drag-and-drop or sequential up/down buttons persist `sortOrder`.

### 6.2 Promotional & Marketing Banners
- **Placement**: `HOMEPAGE_TOP`, `HERO_SLIDER`, `COLLECTION_HEADER`, `PROMOTIONAL_STRIP`.
- **Live Scheduling Window**:
  $$\text{isCurrentlyActive} \iff \text{active} \land (\text{startAt} = \text{null} \lor \text{startAt} \le \text{now}) \land (\text{endAt} = \text{null} \lor \text{endAt} \ge \text{now})$$
- Evaluated server-side; does not rely on client clock.

### 6.3 Editorial Stories
- Fashion journalism and craftsmanship stories.
- Reading time calculated dynamically based on word count (~200 words/min).
- Lifecycle: `DRAFT` $\to$ `PUBLISHED` $\to$ `ARCHIVED`.

---

## 7. Marketing Campaigns & Scheduling

### 7.1 Campaign Orchestration
- Campaigns define promotional events linked to catalog targets:
  - Target Categories
  - Target Collections
  - Target Brands
  - Target Products
- **Discount Configuration**:
  - `type`: `PERCENTAGE` or `FIXED_AMOUNT`
  - `value`: Percentage or minor units
  - `maxDiscountAmount`: Cap on calculated discount
  - `stackable`: Boolean flag for multi-coupon scenarios
- **Pre-Activation Invariants**:
  - `endAt > now`: Cannot activate an already expired campaign.
  - Target existence check: Cannot activate if targeted categories/products have all been deleted.
- **UTM Metadata**:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` for attribution.

### 7.2 Phase 15 Pricing Boundary
Campaign records configure promotional rules. When an order is calculated, the **Phase 15 Pricing Engine** consumes these rules to compute line item discounts and totals. Phase 28 does not maintain a second pricing formula.

---

## 8. Role-Based Access Control (RBAC) & Security

### 8.1 Granular Permissions
| Domain | Permission Key | Required Role |
| :--- | :--- | :--- |
| Products | `products.read` | Admin, Catalog Manager, Super Admin |
| Products | `products.create`, `products.update` | Admin, Catalog Manager, Super Admin |
| Products | `products.publish` | Admin, Catalog Manager, Super Admin |
| Products | `products.archive`, `products.delete` | Admin, Catalog Manager, Super Admin |
| Variants | `variants.read`, `variants.create`, `variants.update` | Admin, Catalog Manager, Super Admin |
| Categories | `categories.read`, `categories.create`, `categories.update` | Admin, Catalog Manager, Super Admin |
| Collections | `collections.read`, `collections.create`, `collections.update` | Admin, Catalog Manager, Super Admin |
| Brands | `brands.read`, `brands.create`, `brands.update` | Admin, Catalog Manager, Super Admin |
| Content | `content.read`, `content.create`, `content.update`, `content.publish` | Admin, Marketing Manager, Super Admin |
| Banners | `banners.read`, `banners.create`, `banners.update`, `banners.delete` | Admin, Marketing Manager, Super Admin |
| Campaigns | `campaigns.read`, `campaigns.create`, `campaigns.update` | Admin, Marketing Manager, Super Admin |
| Campaigns | `campaigns.activate`, `campaigns.pause`, `campaigns.archive` | Admin, Marketing Manager, Super Admin |

*Note: Marketing Managers cannot publish or delete catalog products. Catalog Managers cannot activate or pause marketing campaigns.*

### 8.2 Security Guards
- **Preview Isolation**: Preview endpoints emit `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: private, no-store`.
- **Mass Assignment Protection**: Strict Zod schemas reject unrecognized properties.
- **Audit Logging**: All mutations record actor ID, email, entity type, action, timestamp, and before/after state diffs via `logAuditTrail()`.

---

## 9. API Contracts Summary

### Catalog & Products
- `GET /api/admin/products` — List products with search, status filters, and pagination.
- `POST /api/admin/products` — Create new product with variants and attributes.
- `GET /api/admin/products/:id` — Get full product detail DTO.
- `PATCH /api/admin/products/:id` — Update product.
- `DELETE /api/admin/products/:id` — Archive product.
- `POST /api/admin/products/:id/publish` — Publish product with invariant checks.
- `POST /api/admin/products/:id/unpublish` — Revert product to draft.
- `GET /api/admin/products/:id/preview` — Authenticated preview view.
- `POST /api/admin/products/bulk` — Batch publish, unpublish, or archive.

### Categories, Collections & Brands
- `GET /api/admin/categories` & `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id` & `DELETE /api/admin/categories/:id`
- `POST /api/admin/categories/reorder`
- `GET /api/admin/collections` & `POST /api/admin/collections`
- `PATCH /api/admin/collections/:id` & `DELETE /api/admin/collections/:id`
- `GET /api/admin/brands` & `POST /api/admin/brands`
- `PATCH /api/admin/brands/:id` & `DELETE /api/admin/brands/:id`

### Content & Campaigns
- `GET /api/admin/content/sections` & `POST /api/admin/content/sections` (reorder)
- `PATCH /api/admin/content/sections/:id`
- `GET /api/admin/content/banners` & `POST /api/admin/content/banners`
- `PATCH /api/admin/content/banners/:id` & `DELETE /api/admin/content/banners/:id`
- `GET /api/admin/content/editorial` & `POST /api/admin/content/editorial`
- `PATCH /api/admin/content/editorial/:id` & `DELETE /api/admin/content/editorial/:id`
- `GET /api/admin/campaigns` & `POST /api/admin/campaigns`
- `GET /api/admin/campaigns/:id` & `PATCH /api/admin/campaigns/:id` & `DELETE /api/admin/campaigns/:id`
- `POST /api/admin/campaigns/:id/activate`
- `POST /api/admin/campaigns/:id/pause`
- `POST /api/admin/media/validate`
