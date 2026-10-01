# Catalog & Product Domain (`modules/catalog`)

## Overview
Core fashion e-commerce domain managing luxury apparel collections, categories, product variants, size guides, attributes, and search indices.

## Roadmap Phase
**Phase 04 — Product Catalog, Taxonomy & Variant Architecture**

## Architecture & Responsibilities
- Hierarchical categories (Department > Category > Subcategory).
- Fashion-specific attributes (Fabric, Fit, Pattern, Neckline, Sleeve, Care Instructions).
- SKU and variant matrix management (Size x Color).
- Size charts and measurement tables.

## Planned Module Structure
```text
modules/catalog/
├── product.service.ts
├── category.service.ts
├── variant.service.ts
├── catalog.repository.ts
├── catalog.types.ts
└── catalog.validation.ts
```
