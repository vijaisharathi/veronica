# VÉRONA — Product Catalog System Architecture (Phase 09)

## 1. Overview & Architectural Principles

The **Product Catalog System** is the core commerce foundation of VÉRONA. It connects the category hierarchy and collections established in Phase 08 with real fashion garments, structured variants, pricing foundations in integer minor units, rich media galleries, and deterministic availability presentation.

### Architectural Flow (Strict Layer Separation)

```text
Storefront UI (Server & Client Components)
   ↓
Route Handlers / Server Actions (Validation & RBAC Verification)
   ↓
Product Catalog Service (Domain Logic, Visibility Enforcement, Presentation Sanitization)
   ↓
Product Repository (Indexed Queries, Projection, Batch Variant Resolution)
   ↓
MongoDB Database (Replica Set / Document Store)
```

Direct database calls from UI components are strictly forbidden. All public operations go through customer-safe DTO mappers that strip internal staff notes, operational supplier costs, and unpublished lifecycle metadata.

---

## 2. Product Domain Model

A `Product` represents the conceptual fashion item displayed on the storefront (e.g. *Handwoven Mulberry Silk Blazer*).

```ts
interface IProduct {
  _id: ObjectId;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  brandId?: ObjectId;
  categoryIds: ObjectId[];
  collectionIds: ObjectId[];
  gender: "MEN" | "WOMEN" | "KIDS" | "UNISEX";
  productType: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  visibility: "PUBLIC" | "HIDDEN";
  tags: string[];
  images: Array<{
    url: string;
    alt?: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  fabric?: string;
  fit?: string;
  pattern?: string;
  occasion?: string;
  season?: string;
  careInstructions: string[];
  specifications: Array<{ key: string; value: string }>;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Product Variant Model & Relationships

Garments inherently require multi-dimensional sizing and color permutations. Each variant is modeled as an independent entity linked to its parent product:

```ts
interface IProductVariant {
  _id: ObjectId;
  productId: ObjectId;
  sku: string;
  barcode?: string;
  color: {
    name: string;
    slug: string;
    hexCode: string;
    secondaryHexCode?: string;
  };
  size: string;
  variantImages: string[];
  mrp: number; // Integer minor units (paise)
  sellingPrice: number; // Integer minor units (paise)
  costPrice?: number; // Internal supplier cost (never leaked)
  weightInGrams?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  active: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Garment Variant Invariants:
1. **1-to-N Product Relationship:** A product references multiple variants via indexed foreign key `productId`.
2. **Deterministic Pricing:** Variant prices are the source of truth for product-level pricing ranges.
3. **Structured Sizing & Color:** Sizing follows garment scales (`XS`, `S`, `M`, `L`, `XL`, `38`, `40`, `42`). Colors include display names, slug identifiers, and verified hex color codes for UI swatches.
4. **Phase 12 & Phase 20 Compatibility:** The variant structure separates catalog identity from inventory counts. Real-time warehouse reservations and stock deduction belong to Phase 20.

---

## 4. Brand, Category & Collection Relationships

- **Brand:** Products maintain an optional normalized reference (`brandId`) to the `Brand` collection. If omitted, the default atelier branding (*VÉRONA ATELIER*) is presented.
- **Categories:** Products maintain an array of `categoryIds`. Merchandising taxonomies enforce that only active, non-deleted categories are resolved for public listings.
- **Collections:** Products support bidirectional associations with curated fashion collections (e.g., *The Silk Route*, *Festive Heritage Edit*). If a collection is archived, the product remains active and accessible via its canonical slug.

---

## 5. Product Lifecycle Status & Visibility

VÉRONA enforces a two-tier public gate:

| Status | Visibility | Storefront Listing | Direct Slug Access | Indexable |
| :--- | :--- | :--- | :--- | :--- |
| `PUBLISHED` | `PUBLIC` | Yes | Yes (200 OK) | Yes (Canonical) |
| `PUBLISHED` | `HIDDEN` | No | No (404 Not Found) | No (noindex) |
| `DRAFT` | Any | No | No (404 Not Found) | No |
| `ARCHIVED` | Any | No | No (404 Not Found) | No |

Enforcement occurs strictly on the server: `ProductRepository` and `ProductService` reject draft, archived, or hidden products unless explicit staff preview options are enabled.

---

## 6. SKU & Slug Rules

### Slug Canonicalization
- Deterministic, lowercase, alphanumeric, hyphen-delimited.
- Normalized using `normalizeSlug(input)` in `lib/slug.ts`.
- Validated via regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.
- Unique compound sparse index on `{ slug: 1, isDeleted: 1 }`.

### SKU Constraints
- Normalized uppercase alphanumeric with hyphens (e.g., `VER-MEN-BLZ-BLK-40`).
- Validated server-side via regex `/^[A-Z0-9-]+$/`.
- Unique sparse index on `{ sku: 1 }`.
- System rejects duplicate SKU creation with `409 ConflictError`.

---

## 7. Media Structure & Ordering

Product images feature deterministic ordering and variant associations:
1. **Deterministic Order:** Media items carry an explicit `sortOrder` index (`0`, `1`, `2`, ...). MongoDB natural insertion order is never relied upon.
2. **Primary View:** Exactly one image is marked `isPrimary: true`, driving the storefront listing cards and Open Graph tags.
3. **Variant Swapping:** When a customer selects a color swatch, the gallery dynamically prioritizes variant-specific media (`variant.variantImages`).
4. **Responsive Delivery:** Next.js `<Image>` optimizes delivery with proper `sizes` attributes, blur placeholders, and explicit aspect ratios to prevent Cumulative Layout Shift (CLS).

---

## 8. Pricing Foundations & Minor Units

All monetary values are stored internally as integer minor units (paise for INR).

```text
₹4,999.00 = 499900 paise
```

- **Floating-point calculations are strictly prohibited.**
- `minorToMajor(amount)` converts paise to rupees for customer presentation.
- `majorToMinor(amount)` converts user inputs to stored paise.
- `formatMoney(amountInMinorUnits)` uses `Intl.NumberFormat('en-IN')` to render locale-safe currency (`₹4,999`).
- `calculateDiscountPercent(mrpMinor, sellingMinor)` computes discounts deterministically without rounding errors.

---

## 9. Customer-Safe ProductDTO

Raw database models are never returned to client components. `ProductService.toProductDTO()` strips internal properties:

```ts
interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  brand: ProductBrandDTO | null;
  categories: ProductCategoryDTO[];
  collections: ProductCollectionDTO[];
  media: ProductMediaDTO[];
  variants: ProductVariantDTO[];
  attributes: ProductAttributeDTO[];
  fabric?: string;
  fit?: string;
  pattern?: string;
  occasion?: string;
  season?: string;
  careInstructions: string[];
  pricing: ProductPricingDTO;
  availability: ProductAvailabilityDTO;
  seo?: { title?: string; description?: string; keywords?: string[] };
  gender: Gender;
  productType: string;
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  status: ProductStatus;
  visibility?: ProductVisibility;
  createdAt: string;
}
```

---

## 10. Database Indexes & Performance Optimization

To guarantee sub-50ms catalog lookups and prevent N+1 query bottlenecks, compound indexes are established:

```ts
// Product Collection
ProductSchema.index({ slug: 1, isDeleted: 1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1 });
ProductSchema.index({ categoryIds: 1, status: 1, visibility: 1, isDeleted: 1 });
ProductSchema.index({ collectionIds: 1, status: 1, visibility: 1, isDeleted: 1 });
ProductSchema.index({ brandId: 1, status: 1, isDeleted: 1 });
ProductSchema.index({ gender: 1, status: 1, isDeleted: 1 });
ProductSchema.index({ newArrival: 1, createdAt: -1 });
ProductSchema.index({ bestseller: 1 });
ProductSchema.index({ featured: 1 });

// Product Variant Collection
ProductVariantSchema.index({ productId: 1, active: 1, isDeleted: 1 });
ProductVariantSchema.index({ sku: 1 }, { unique: true });
ProductVariantSchema.index({ "color.slug": 1, size: 1 });
```

### Zero N+1 Batched Variant Resolution:
`ProductRepository.getVariantsByProductIds(productIds)` loads all variants for an entire page of products in a single `$in` query and groups them in an in-memory `Map<string, IProductVariant[]>`.

---

## 11. API Contracts

### Public Endpoints
- `GET /api/products`: Paginated public product listing with query filters (`page`, `limit`, `gender`, `tag`, `productType`, `sort`).
- `GET /api/products/:slug`: Single product detail with DTO, availability, related products, and breadcrumbs.
- `GET /api/categories/:slug/products`: Products categorized under a specific category hierarchy.
- `GET /api/collections/:slug/products`: Products curated under a fashion collection.

### Admin Mutation Endpoints (RBAC Guarded)
- `POST /api/admin/products`: Requires `products.create` permission.
- `PATCH /api/admin/products/:id`: Requires `products.update` permission.
- `DELETE /api/admin/products/:id`: Requires `products.delete` permission (soft delete).
- `POST /api/admin/products/:id/variants`: Requires `products.create` permission.
- `PATCH /api/admin/variants/:id`: Requires `products.update` permission.
- `DELETE /api/admin/variants/:id`: Requires `products.delete` permission.

---

## 12. SEO & Schema.org JSON-LD Structured Data

Each product page dynamically generates metadata and Schema.org structured data:
- **Canonical URL:** `https://verona.com/product/${slug}`.
- **Open Graph:** Product title, description, primary image, currency `INR`.
- **JSON-LD Schema (`Product`):**
  - `@type: "Product"`
  - `name`, `description`, `image`
  - `brand: { @type: "Brand", name: brandName }`
  - `offers: { @type: "Offer", priceCurrency: "INR", price: sellingPrice, availability: "InStock" | "OutOfStock" }`
  - Zero fabricated ratings or review counts (reviews belong strictly to Phase 24).

---

## 13. Deterministic Seed Strategy

`db/seed.ts` populates a comprehensive, realistic garment catalog:
- 14 distinct luxury fashion pieces across Men, Women, and Kids.
- Garment categories: Handwoven Kurtas, Tailored Blazers, Trench Coats, Evening Gowns, Mulberry Silk Sarees, Cotton Chinos, Pleated Skirts, Linen Shirts.
- Multiple variants per product with structured color swatches and garment sizing.
- Deterministic minor-unit pricing (e.g. ₹4,999 = 499900 paise).
- Seed scripts use idempotent upserts (`findOneAndUpdate`) preventing data duplication on repeated runs.

---

## 14. Strict Phase 09 Boundaries

The following features belong strictly to future phases and are **NOT** implemented in Phase 09:
- ❌ Search engine, search ranking, and autocomplete (Phase 10)
- ❌ Advanced multi-facet filtering engine (Phase 10)
- ❌ Garment sizing matrix & measurements guide (Phase 12)
- ❌ Dynamic coupons & campaign promotion engine (Phase 15)
- ❌ Shopping Cart & Persistent Bag (Phase 16)
- ❌ Checkout & Payment Processing (Phases 17 & 18)
- ❌ Inventory reservation, warehouse allocation & real-time stock deductions (Phase 20)
- ❌ Product Reviews & Ratings (Phase 24)
