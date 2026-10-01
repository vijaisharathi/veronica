# VÉRONA — Phase 11: Product Details Experience

## 1. Overview & Architecture

Phase 11 delivers the customer-facing **Product Details Experience** for VÉRONA. It transforms the catalog domain data established in Phase 9 into a responsive, accessible, high-performance atelier shopping experience.

```text
Storefront Route (`/product/[slug]`)
          ↓
Product Domain Service (`ProductService.getProductBySlug`)
          ↓
Product Repository (`ProductRepository.findBySlug`)
          ↓
Catalog Database (MongoDB: Products, Variants, Brands, Categories, Collections)
```

- **Server-Rendered Core**: The product page is rendered as a Next.js Server Component. Client interactivity is limited to transient UI state (gallery active image, zoom toggle, variant selection, accordion toggles, share link copy, and pincode input validation).
- **Public Visibility Enforcement**: Only products with `status: "PUBLISHED"`, `visibility: "PUBLIC"`, and `isDeleted: false` are accessible. Draft or archived products trigger a canonical 404 (`notFound()`).

---

## 2. Page Structure & Component Hierarchy

The product details page is composed of distinct, modular components within `@/components/product`:

```text
ProductDetailPage (`app/(storefront)/product/[slug]/page.tsx`)
├── Schema.org JSON-LD Script (`application/ld+json`)
├── Breadcrumb Navigation (`components/ui/breadcrumb.tsx`)
└── ProductDetailView (`components/product/product-detail-view.tsx`)
    ├── ProductGallery (`components/product/product-gallery.tsx`)
    │   ├── Next.js Image (LCP priority, 3:4 aspect ratio)
    │   ├── Thumbnail Strip (keyboard navigable, accessible tabs)
    │   ├── Prev/Next Image Navigation
    │   └── Lightbox / Zoom Toggle
    ├── Product Info & Pricing
    │   ├── Brand Link (`/search?brand=[slug]`)
    │   ├── Single Primary H1 Heading
    │   ├── Formatted Selling Price & Strikethrough MRP
    │   ├── Calculated Discount Percentage Badge
    │   └── Product Tags (`NEW`, `BESTSELLER`, `SALE`)
    ├── VariantSelector Foundation (`components/product/variant-selector.tsx`)
    │   ├── ColorSelector (swatches with visual active rings)
    │   └── SizeSelector (size buttons + SizeChartDialog)
    ├── Availability Badge & SKU Indicator
    ├── Product Action Area
    │   ├── Add to Bag (Phase 14 boundary placeholder)
    │   ├── Save to Wishlist (Phase 13 boundary placeholder)
    │   └── ProductShareButton (Web Share API + clipboard copy)
    ├── PincodeChecker (`components/product/pincode-checker.tsx`)
    ├── Information Accordion (`components/ui/accordion.tsx`)
    │   ├── Garment Narrative & Design Notes
    │   ├── Artisanal Specifications & Attributes (Fabric, Fit, Pattern, Occasion, Season)
    │   ├── Care & Preservation
    │   └── Atelier Dispatch & Services Foundation
    └── Complete The Look / Related Products (`components/product/product-grid.tsx`)
```

---

## 3. Strict Phase Boundaries & Integrity

To preserve architectural discipline, future commerce workflows are strictly prevented from fabricating fake client-side success:

| Feature Area | Owning Phase | Phase 11 Status | Boundary Rule |
| :--- | :--- | :--- | :--- |
| **Garment Variant Logic** | Phase 12 | Presentation Foundation | Color and size selectors provide visual state. Full matrix inventory resolution belongs to Phase 12. |
| **Wishlist Persistence** | Phase 13 | UI Placement | Button is available but does not fabricate local storage state. |
| **Cart Persistence** | Phase 14 | UI Placement | "Add to Bag" button is available with clear phase disclaimer; never displays fake "Added" notifications. |
| **Pincode Delivery** | Phase 16 | UI Validation | Validates 6-digit Indian PIN codes; strictly does not display fake "Delivery in 2 days" or false COD claims. |
| **Inventory Mutation** | Phase 20 | Catalog Snapshot | Displays catalog-level in-stock / out-of-stock badge only; does not perform real-time warehouse reservation. |
| **Reviews & Ratings** | Phase 24 | Omitted | No fabricated star ratings, review counts, or fake customer testimonials are rendered. |

---

## 4. Product Media Gallery & LCP Optimization

- **LCP Optimization**: The primary garment image uses Next.js `<Image />` with `priority={true}` and explicit `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 650px"` to prevent Cumulative Layout Shift (CLS).
- **Descriptive Alt Text**: Images feature descriptive alt text (e.g. `"${title} — Atelier fashion view ${idx + 1}"`), rejecting placeholder strings like `"photo"` or `"image1"`.
- **Media Switching**: When a customer selects a color swatch, the gallery inspects the active variant or matching color variants. If variant-specific images exist, the gallery seamlessly updates the image list.
- **Keyboard Navigation**: ArrowLeft and ArrowRight keys cycle through the gallery. The Escape key resets image zoom mode.

---

## 5. Breadcrumb Hierarchy

Breadcrumbs are dynamically constructed by walking the category hierarchy:
- `Home` (`/`)
- `[Gender / Department]` (e.g. `Men` -> `/men`, `Women` -> `/women`)
- `[Parent Category]` (e.g. `Clothing` -> `/shop?category=clothing`)
- `[Child Category]` (e.g. `T-Shirts` -> `/shop?category=t-shirts`)
- `[Product Name]` (Terminal crumb without link)

---

## 6. SEO, OpenGraph & Structured Data

- **Title & Description**: Generated dynamically from catalog SEO attributes or fallback to `${product.name} | ${product.brand.name}`.
- **Canonical URL**: Every product page specifies a canonical link: `/product/${product.slug}`.
- **OpenGraph & Twitter Cards**: Exposes high-resolution primary image, product title, and description.
- **Schema.org Product JSON-LD**:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Mulberry Silk Evening Gown",
    "description": "...",
    "image": ["..."],
    "sku": "VER-DRS-NOIR-S",
    "brand": {
      "@type": "Brand",
      "name": "VÉRONA ATELIER"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": 18000,
      "availability": "https://schema.org/InStock",
      "url": "https://verona.fashion/product/mulberry-silk-evening-gown",
      "itemCondition": "https://schema.org/NewCondition"
    }
  }
  ```
  Fabricated review counts and rating values are strictly omitted in compliance with Schema.org specifications.

---

## 7. Related Products

- **Zero N+1 Query Resolution**: Related products are queried based on the primary category and gender of the active silhouette.
- **Deduplication**: The active product is filtered out of the result set to ensure a product never recommends itself.
- **Card Reuse**: Reuses the canonical `ProductCard` from Phase 7/9.

---

## 8. State Handling

- **Loading State (`loading.tsx`)**: Renders skeletons matching the exact dimensions of the gallery, breadcrumbs, info panel, and related items.
- **Not Found State (`not-found.tsx`)**: Renders an accessible luxury 404 screen when a product slug does not exist or is marked as draft/archived.
- **Error Boundary (`error.tsx`)**: Catches unexpected runtime errors while maintaining global storefront navigation.
