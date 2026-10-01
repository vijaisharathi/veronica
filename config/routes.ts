/**
 * VÉRONA — Centralized Route Constants
 *
 * Single source of truth for all application routes.
 * Prevents magic strings and broken internal links.
 */

export const ROUTES = {
  // Storefront Primary Routes
  HOME: "/",
  SHOP: "/shop",
  MEN: "/men",
  WOMEN: "/women",
  KIDS: "/kids",
  NEW_ARRIVALS: "/new-arrivals",
  SALE: "/sale",
  SEARCH: "/search",
  PRODUCT: (slug: string) => `/product/${slug}`,
  CATEGORY: (slug: string) => `/shop?category=${slug}`,
  COLLECTION: (slug: string) => `/collection/${slug}`,

  // Customer Commerce & Account Routes
  WISHLIST: "/wishlist",
  ACCOUNT_WISHLIST: "/account/wishlist",
  ACCOUNT_RECENTLY_VIEWED: "/account/recently-viewed",
  CART: "/cart",
  CHECKOUT: "/checkout",
  ACCOUNT: "/account",
  ACCOUNT_PROFILE: "/account/profile",
  ACCOUNT_SETTINGS: "/account/settings",
  ACCOUNT_ORDERS: "/account/orders",
  ACCOUNT_ORDER_DETAIL: (orderNumber: string) => `/account/orders/${orderNumber}`,
  LOGIN: "/login",
  SIGNUP: "/signup",

  // Presentation & UI State Catalog
  STATES: "/states",

  // Internal Operations / Admin Routes (Strictly Isolated)
  ADMIN: "/admin",
  ADMIN_PRODUCTS: "/admin/products",
  ADMIN_INVENTORY: "/admin/inventory",
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_STAFF: "/admin/staff",
  ADMIN_ACCESS_DENIED: "/admin/access-denied",
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
