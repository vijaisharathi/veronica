# VÉRONA — Phase 10: Product Search System

## 1. Search Architecture

VÉRONA implements a multi-tier, decoupled search architecture separating the presentation layer from the data layer:

```text
Storefront UI (SearchPage / SearchBar / SearchFilters / SearchOverlay)
       ↓
Search API Routes (`/api/search`, `/api/search/suggestions`)
       ↓
Search Domain Service (`SearchService`)
       ↓
SearchProvider Abstraction (`SearchProvider` interface)
       ↓
MongoDB-Native Search Provider (`MongoSearchProvider`)
       ↓
Catalog Database (Products, Variants, Brands, Categories, Collections)
```

- **Separation of Concerns**: React components never query MongoDB directly. All queries pass through server-side validation, query normalization, and domain service transformations.
- **Customer-Safe DTO Transformation**: Internal database identifiers, cost prices, supplier data, and audit records are completely stripped before returning search results.

---

## 2. Search Provider Decision

### Decision: MongoDB-Native Search via `SearchProvider` Interface

We evaluated external search infrastructure (such as Elasticsearch, Algolia, Meilisearch, and Typesense) versus MongoDB-native search:

1. **Simplicity & Zero Added Infrastructure**: The project architecture already runs on MongoDB and Mongoose. Introducing an external search cluster adds operational overhead, index sync delays, and network hops.
2. **Provider Abstraction**: All search operations implement the `SearchProvider` interface:
   ```ts
   export interface SearchProvider {
     search(request: SearchRequest, normalized: NormalizedSearchQuery): Promise<SearchProviderResult>;
     suggest(query: string, normalized: NormalizedSearchQuery, limit?: number): Promise<SearchSuggestionPayload>;
   }
   ```
   If future catalog scale exceeds tens of thousands of SKUs and requires MongoDB Atlas Search (Lucene) or an external engine, the transition requires only a new provider class (`AtlasSearchProvider` or `AlgoliaSearchProvider`) injected into `SearchService`. Storefront UI components and API contracts remain untouched.

---

## 3. Searchable Fields & Relevance Weighting

### Searchable Fields
Search queries operate strictly across customer-facing, public catalog fields:
- **Product Name** (Weight: 10) — Highest relevance
- **Tags & Product Type** (Weight: 5) — High relevance
- **Fabric & Fit** (Weight: 4) — High garment attribute relevance
- **Pattern & Occasion** (Weight: 3) — Medium contextual relevance
- **Product Description** (Weight: 1) — Baseline relevance
- **SKU** — Exact-match lookup directly on the `ProductVariantModel`

### Public Visibility Enforcement
Every search query enforces the strict catalog visibility gate:
```ts
{
  status: "PUBLISHED",
  visibility: "PUBLIC",
  isDeleted: false
}
```
Draft, archived, deleted, or unlisted products can never be discovered via search.

---

## 4. Query Normalization & Typo Tolerance

### Normalization Pipeline
1. **Unicode NFKC Normalization**: Resolves compatibility characters and full-width latin glyphs.
2. **Whitespace Collapsing**: Trims leading/trailing whitespace and collapses consecutive spaces.
3. **Case Normalization**: Converts all terms to lowercase for uniform token matching.
4. **Sanitization**: Strips HTML tags, script delimiters, and unsafe MongoDB operators (`$`, `<>`, `{}`).
5. **Length Enforcement**: Queries are strictly capped at 100 characters to prevent denial-of-service scans.

### Controlled Fashion Synonyms
Controlled deterministic mappings expand common fashion terminology:
- `tee` / `tees` → `t-shirt`
- `denim` → `jeans`
- `suit` / `blazers` → `blazer`
- `coat` / `overcoat` / `trench` → `overcoat`
- `pant` / `pants` / `slacks` → `trouser`
- `sweater` / `pullover` / `jumper` → `knitwear`

### Typo Recovery ("Did You Mean")
When a search returns zero results, the normalizer checks the tokens against the curated VÉRONA fashion vocabulary using Levenshtein distance:
- `oversizd` → `Did you mean "oversized"?`
- `cashemere` → `Did you mean "cashmere"?`
- `tshrt` → `Did you mean "t-shirt"?`

---

## 5. Structured Facet Filtering & Price Representation

The search system extracts and applies structured facets without full table scans:
- **Department / Gender**: `MEN`, `WOMEN`, `KIDS`, `UNISEX`
- **Category**: Resolved via canonical category slugs
- **Collection**: Resolved via canonical collection slugs
- **Brand**: Resolved via canonical brand slugs
- **Color**: Structured color swatch lookup with hex codes and variant counts
- **Size**: Garment sizes (`XS`, `S`, `M`, `L`, `XL`, `40`, `42`, etc.)
- **Fabric & Fit**: Structured attributes (`Linen`, `Silk`, `Cashmere`, `Relaxed`, `Tailored`, `Oversized`)
- **Price Range Filter**:
  - Always represented in **integer minor units (paise)** on the database level.
  - Converted to major units (rupees) in UI presentations.
  - Server-side validation guarantees `minPrice <= maxPrice` and non-negative bounds.

### Deduplication Guarantee
Products with multiple variants, colors, or categories appear **exactly once** in search results through ID deduplication.

---

## 6. Suggestions & Autocomplete (`GET /api/search/suggestions`)

- **Debounced Execution**: Search input debounces at 250ms with `AbortController` cancellation for rapid keystrokes.
- **Lightweight Payload**: Autocomplete returns only IDs, titles, primary image URLs, prices, and matching category/collection links.
- **Keyboard Navigation**: Full support for `ArrowDown`, `ArrowUp`, `Enter`, and `Escape`.

---

## 7. Privacy-Safe Recent Searches

- **Client-Side Storage**: Recent queries are stored exclusively in the customer's browser `localStorage` under `verona_recent_searches_v1`.
- **Zero Leakage**: Search history is never exposed across users or transmitted over shared/public APIs.
- **Controls**: Users can remove individual search entries or clear their entire search history at any time. History is capped at 8 entries with case-insensitive deduplication.

---

## 8. Search Telemetry Foundation

Structured telemetry events are logged with redaction for privacy:
- `search_submitted`: Logged when a user initiates a query with result count.
- `search_no_results`: Logged when a query yields 0 results to track catalog gaps.
- `search_result_clicked`: Foundation for recording product navigation from search.
- `suggestion_clicked`: Foundation for measuring autocomplete effectiveness.

---

## 9. SEO & Canonical Strategy

1. **Dynamic Search Indexing Safeguard**:
   Search results set:
   ```ts
   robots: {
     index: false,
     follow: true,
   }
   ```
   This prevents search engines from indexing infinite permutations of dynamic query strings while allowing spiders to follow product links.
2. **Canonical URLs**:
   Search URLs are canonically normalized with deterministic parameter ordering:
   `/search?q=blazer&category=outerwear`

---

## 10. API Contracts

### `GET /api/search`
Query Parameters:
- `q`: Search query string (max 100 characters)
- `category`: Category slug
- `collection`: Collection slug
- `brand`: Brand slug
- `gender`: `MEN` | `WOMEN` | `KIDS` | `UNISEX`
- `color`: Color slug
- `size`: Size label
- `minPrice`: Minimum price in Rupees
- `maxPrice`: Maximum price in Rupees
- `sort`: `relevance` | `newest` | `price_asc` | `price_desc`
- `page`: Page number (integer, min 1)
- `limit`: Items per page (integer, min 1, max 50)

Response Payload (`SearchResultPayload`):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false,
    "facets": {
      "categories": [...],
      "brands": [...],
      "genders": [...],
      "colors": [...],
      "sizes": [...],
      "priceRange": { "min": 2500, "max": 18000 }
    },
    "activeFilters": {},
    "sort": "relevance",
    "didYouMean": null
  }
}
```

### `GET /api/search/suggestions`
Query Parameters:
- `q`: Query string (min 1, max 100 characters)
- `limit`: Suggestion count (min 1, max 20, default 8)

---

## 11. Known Limitations & Future Extensibility

- **Fuzzy Levenshtein Search in DB**: MongoDB-native queries use text indexing and token regex. If advanced acoustic phonetics or deep N-gram typo tolerance is required, migration to Atlas Search (Lucene) can be performed by implementing a new `SearchProvider`.
- **Search Analytics Aggregation**: Search analytics events are currently logged via the structured logger (`logger.info`). In Phase 25/27, these will sink to an analytics database collection for trend calculation.
