# VÉRONA — Global Storefront & Navigation Architecture

## Overview

Phase 06 establishes the production-grade global storefront shell and responsive navigation system for **VÉRONA**. It synthesizes high-density Indian fashion e-commerce usability patterns (inspired by Myntra, AJIO, and Flipkart) with an original, haute couture aesthetic.

---

## 1. Storefront Shell Hierarchy

```text
                    VÉRONA Storefront Shell
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
       Desktop                                   Mobile
          │                                         │
    AnnouncementBar                           AnnouncementBar
          │                                         │
    Desktop Header                             Mobile Header
  (Logo, Nav, Search,                       (Hamburger, Logo,
    Wishlist, Bag, Acc)                        Wishlist, Bag)
          │                                         │
      Mega Menu                                Search Bar
          │                                         │
          │                                    Mobile Drawer
          │                                         │
          └────────────────────┬────────────────────┘
                               │
                     Storefront Main Body
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
   Storefront Footer                      Mobile Bottom Nav
 (Assurances, Columns,                   (Home, Shop, Search,
     Gazette, Legal)                       Wishlist, Account)
```

---

## 2. Centralized Route & Navigation Configuration

All routes and navigation elements are strictly centralized to eliminate magic strings and dead links:

- **`config/routes.ts`**:
  - Primary: `ROUTES.HOME`, `ROUTES.MEN`, `ROUTES.WOMEN`, `ROUTES.KIDS`, `ROUTES.NEW_ARRIVALS`, `ROUTES.SALE`, `ROUTES.SEARCH`, `ROUTES.SHOP`, `ROUTES.PRODUCT(slug)`
  - Commerce & Account: `ROUTES.WISHLIST`, `ROUTES.CART`, `ROUTES.ACCOUNT`, `ROUTES.ACCOUNT_PROFILE`, `ROUTES.ACCOUNT_SETTINGS`, `ROUTES.LOGIN`, `ROUTES.SIGNUP`
  - Internal Operations: `ROUTES.ADMIN`, `ROUTES.ADMIN_PRODUCTS`, `ROUTES.ADMIN_INVENTORY`, `ROUTES.ADMIN_ORDERS`, `ROUTES.ADMIN_STAFF`, `ROUTES.ADMIN_ACCESS_DENIED`
- **`config/navigation.ts`**:
  - `PRIMARY_NAVIGATION`: Men, Women, Kids, New Arrivals, Sale with structured mega menu sections and editorial drops.
  - `ANNOUNCEMENT_CONFIG`: Configurable, dismissible promotional notices.
  - `SEARCH_SUGGESTIONS`: Recent searches, trending searches, and popular department shortcuts.
  - `FOOTER_SECTIONS`: Online Shopping, Customer Concierge, The Maison, Legal & Integrity.

---

## 3. Storefront / Admin Isolation

A strict security and presentation boundary separates the customer storefront from internal operations:
1. **Layout Isolation**:
   - Customer Storefront: [`app/(storefront)/layout.tsx`](file:///d:/portfolio%20pages/garments%20e-commerce/app/(storefront)/layout.tsx)
   - Admin Operations: [`app/admin/layout.tsx`](file:///d:/portfolio%20pages/garments%20e-commerce/app/admin/layout.tsx)
2. **Zero Admin Leakage**:
   - Customer header, mega menu, mobile drawer, and footer contain zero administrative links.
   - Customers navigating directly to `/admin` are rejected with HTTP 403 `STAFF_ONLY` and directed to `/admin/access-denied`.

---

## 4. Search UI & Safe Parameter Handling

- Search UI supports presentation states: `IDLE`, `FOCUSED`, `TYPING`, `SUGGESTIONS`, `RECENT_SEARCHES`, `TRENDING_SEARCHES`, `NO_RESULTS`.
- Keyboard accessibility:
  - Auto-focuses input upon opening.
  - Escape key closes overlay and restores focus to the triggering element.
  - Enter key safely encodes the query and navigates to `/search?q=<safe-query>`.
- Parameter safety: The search page sanitizes query parameters to prevent XSS and HTML injection.
- Phase 06 boundary: No real search engine or database queries are executed; presentation states and discoverability shortcuts are rendered.

---

## 5. Breadcrumb & State Architecture

- **Breadcrumbs (`components/navigation/breadcrumbs.tsx`)**:
  - Semantic `<nav aria-label="Breadcrumb">` with structured `<ol>` and `<li>`.
  - Accessible `aria-current="page"` applied to terminal node.
  - Responsive truncation preventing layout breaks.
- **Global Error Boundary (`app/(storefront)/error.tsx`)**:
  - Friendly customer messaging with retry action and Home link without leaking stack traces.
- **Global Not-Found (`app/(storefront)/not-found.tsx`)**:
  - Original VÉRONA haute couture 404 page ("Out of Style").
- **Offline & Slow Network States**:
  - `OfflineState`: Polished disconnected indicator with reconnect callback.
  - `SlowNetworkState`: Polite status indicator with skeleton placeholders.

---

## 6. Accessibility & Responsive Standards

- **Touch & Viewport Compliance**:
  - Mobile bottom navigation respects `env(safe-area-inset-bottom)`.
  - Zero horizontal overflow across all standard mobile, tablet, and desktop breakpoints (320px, 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px, 1920px).
- **Keyboard Navigation**:
  - Full keyboard control: Tab, Shift+Tab, Enter, Space, Escape.
  - Visible focus rings (`focus:ring-1 focus:ring-primary`).
  - Drawer and dialog focus trap and restoration to triggering buttons.
