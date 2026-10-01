/**
 * VÉRONA — Centralized Permission Registry
 *
 * Defines strongly-typed permission constants across all domains following
 * the `resource.action` naming standard.
 */

export interface PermissionDefinition {
  key: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export const PERMISSIONS = {
  // Account (Customer Self-Service)
  ACCOUNT_READ_SELF: "account.read.self",
  ACCOUNT_UPDATE_SELF: "account.update.self",
  PREFERENCES_READ_SELF: "preferences.read.self",
  PREFERENCES_UPDATE_SELF: "preferences.update.self",
  ORDERS_READ_SELF: "orders.read.self",
  ORDERS_CANCEL_SELF: "orders.cancel.self",
  WISHLIST_READ_SELF: "wishlist.read.self",
  WISHLIST_WRITE_SELF: "wishlist.write.self",
  CART_READ_SELF: "cart.read.self",
  CART_WRITE_SELF: "cart.write.self",
  RETURNS_CREATE_SELF: "returns.create.self",
  REVIEWS_CREATE_SELF: "reviews.create.self",
  ADDRESSES_READ_SELF: "addresses.read.self",
  ADDRESSES_WRITE_SELF: "addresses.write.self",

  // Products
  PRODUCTS_READ: "products.read",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  PRODUCTS_PUBLISH: "products.publish",
  PRODUCTS_ARCHIVE: "products.archive",

  // Garment Variants (Phase 12 / 28)
  VARIANTS_READ: "variants.read",
  VARIANTS_CREATE: "variants.create",
  VARIANTS_UPDATE: "variants.update",
  VARIANTS_DELETE: "variants.delete",

  // Categories & Brands (Phase 8 / 28)
  CATEGORIES_READ: "categories.read",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_UPDATE: "categories.update",
  CATEGORIES_DELETE: "categories.delete",
  BRANDS_READ: "brands.read",
  BRANDS_CREATE: "brands.create",
  BRANDS_UPDATE: "brands.update",
  BRANDS_DELETE: "brands.delete",

  // Inventory & Warehouses
  INVENTORY_READ: "inventory.read",
  INVENTORY_UPDATE: "inventory.update",
  INVENTORY_UPDATE_LIMITED: "inventory.update.limited",
  INVENTORY_RECEIVE: "inventory.receive",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_RESERVE: "inventory.reserve",
  INVENTORY_RELEASE: "inventory.release",
  INVENTORY_MANAGE: "inventory.manage",
  WAREHOUSES_READ: "warehouses.read",
  WAREHOUSES_CREATE: "warehouses.create",
  WAREHOUSES_UPDATE: "warehouses.update",
  WAREHOUSES_MANAGE: "warehouses.manage",
  STOCK_ADJUST_CREATE: "stockAdjustments.create",

  // Orders & Fulfillment
  ORDERS_READ: "orders.read",
  ORDERS_READ_LIMITED: "orders.read.limited",
  ORDERS_UPDATE: "orders.update",
  ORDERS_CANCEL: "orders.cancel",
  ORDERS_MANAGE: "orders.manage",
  ORDERS_FULFILLMENT: "orders.fulfillment",
  ORDERS_PACK: "orders.pack",
  ORDERS_SHIP: "orders.ship",
  FULFILLMENT_READ: "fulfillment.read",
  FULFILLMENT_ALLOCATE: "fulfillment.allocate",
  FULFILLMENT_PICK: "fulfillment.pick",
  FULFILLMENT_PACK: "fulfillment.pack",
  FULFILLMENT_MANAGE: "fulfillment.manage",
  SHIPMENTS_READ: "shipments.read",
  SHIPMENTS_CREATE: "shipments.create",
  SHIPMENTS_UPDATE: "shipments.update",
  SHIPMENTS_TRACK: "shipments.track",
  SHIPMENTS_RECONCILE: "shipments.reconcile",
  SHIPMENTS_MANAGE: "shipments.manage",

  // Customers (Phase 29)
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_READ_LIMITED: "customers.read.limited",
  CUSTOMERS_UPDATE: "customers.update",
  CUSTOMERS_MANAGE: "customers.manage",
  CUSTOMERS_SUSPEND: "customers.suspend",
  CUSTOMERS_RESTORE: "customers.restore",
  CUSTOMERS_ADDRESSES_READ: "customers.addresses.read",

  // Returns & Exchanges (Phase 22)
  RETURNS_READ: "returns.read",
  RETURNS_READ_LIMITED: "returns.read.limited",
  RETURNS_REVIEW: "returns.review",
  RETURNS_APPROVE: "returns.approve",
  RETURNS_REJECT: "returns.reject",
  RETURNS_RECEIVE: "returns.receive",
  RETURNS_INSPECT: "returns.inspect",
  RETURNS_DISPOSITION: "returns.disposition",
  RETURNS_MANAGE: "returns.manage",
  RETURNS_UPDATE: "returns.update",

  EXCHANGES_READ: "exchanges.read",
  EXCHANGES_APPROVE: "exchanges.approve",
  EXCHANGES_REJECT: "exchanges.reject",
  EXCHANGES_MANAGE: "exchanges.manage",

  // Refunds (Phase 23)
  REFUNDS_READ: "refunds.read",
  REFUNDS_REQUEST: "refunds.request",
  REFUNDS_APPROVE: "refunds.approve",
  REFUNDS_INITIATE: "refunds.initiate",
  REFUNDS_RETRY: "refunds.retry",
  REFUNDS_RECONCILE: "refunds.reconcile",
  REFUNDS_MANAGE: "refunds.manage",
  REFUNDS_PROCESS: "refunds.process",

  // Reviews & Ratings (Phase 24)
  REVIEWS_READ: "reviews.read",
  REVIEWS_MODERATE: "reviews.moderate",
  REVIEWS_PUBLISH: "reviews.publish",
  REVIEWS_REJECT: "reviews.reject",
  REVIEWS_HIDE: "reviews.hide",
  REVIEWS_RESTORE: "reviews.restore",
  REVIEWS_REPORTS_READ: "reviews.reports.read",
  REVIEWS_REPORTS_MANAGE: "reviews.reports.manage",
  REVIEWS_MANAGE: "reviews.manage",

  // Marketing & Campaigns (Phase 28)
  CAMPAIGNS_READ: "campaigns.read",
  CAMPAIGNS_CREATE: "campaigns.create",
  CAMPAIGNS_UPDATE: "campaigns.update",
  CAMPAIGNS_DELETE: "campaigns.delete",
  CAMPAIGNS_ACTIVATE: "campaigns.activate",
  CAMPAIGNS_PAUSE: "campaigns.pause",
  CAMPAIGNS_ARCHIVE: "campaigns.archive",

  // Content & Banners (Phase 28)
  CONTENT_READ: "content.read",
  CONTENT_CREATE: "content.create",
  CONTENT_UPDATE: "content.update",
  CONTENT_PUBLISH: "content.publish",
  CONTENT_ARCHIVE: "content.archive",
  BANNERS_READ: "banners.read",
  BANNERS_CREATE: "banners.create",
  BANNERS_UPDATE: "banners.update",
  BANNERS_DELETE: "banners.delete",

  // Collections (Phase 8 / 28)
  COLLECTIONS_READ: "collections.read",
  COLLECTIONS_CREATE: "collections.create",
  COLLECTIONS_UPDATE: "collections.update",
  COLLECTIONS_DELETE: "collections.delete",

  // Coupons & Pricing (Phase 15)
  COUPONS_READ: "coupons.read",
  COUPONS_CREATE: "coupons.create",
  COUPONS_UPDATE: "coupons.update",
  COUPONS_DELETE: "coupons.delete",
  COUPONS_DISABLE: "coupons.disable",
  DISCOUNTS_READ: "discounts.read",
  DISCOUNTS_CREATE: "discounts.create",
  DISCOUNTS_UPDATE: "discounts.update",
  DISCOUNTS_DELETE: "discounts.delete",
  PRICING_READ: "pricing.read",
  PRICING_UPDATE: "pricing.update",

  // Delivery & Serviceability (Phase 16)
  DELIVERY_READ: "delivery.read",
  DELIVERY_UPDATE: "delivery.update",
  SERVICEABILITY_READ: "serviceability.read",
  SERVICEABILITY_UPDATE: "serviceability.update",

  // Customer Support (Phase 26)
  SUPPORT_READ: "support.read",
  SUPPORT_CREATE: "support.create",
  SUPPORT_REPLY: "support.reply",
  SUPPORT_UPDATE: "support.update",
  SUPPORT_ASSIGN: "support.assign",
  SUPPORT_REASSIGN: "support.reassign",
  SUPPORT_INTERNAL_NOTES: "support.internal_notes",
  SUPPORT_CLOSE: "support.close",
  SUPPORT_REOPEN: "support.reopen",
  SUPPORT_MANAGE: "support.manage",
  SUPPORT_ATTACHMENTS_READ: "support.attachments.read",
  SUPPORT_ATTACHMENTS_WRITE: "support.attachments.write",
  SUPPORT_AUDIT_READ: "support.audit.read",
  SUPPORT_SLA_READ: "support.sla.read",
  SUPPORT_ANALYTICS_READ: "support.analytics.read",

  // Analytics
  ANALYTICS_READ: "analytics.read",
  ANALYTICS_READ_MARKETING: "analytics.read.marketing",

  // Staff Administration (Phase 29)
  STAFF_READ: "staff.read",
  STAFF_CREATE: "staff.create",
  STAFF_UPDATE: "staff.update",
  STAFF_DELETE: "staff.delete",
  STAFF_SUSPEND: "staff.suspend",
  STAFF_RESTORE: "staff.restore",
  STAFF_ROLES_MANAGE: "staff.roles.manage",
  STAFF_PERMISSIONS_READ: "staff.permissions.read",
  STAFF_PERMISSIONS_MANAGE: "staff.permissions.manage",
  STAFF_SCOPE_MANAGE: "staff.scope.manage",

  // Roles & Permissions (Phase 29)
  ROLES_READ: "roles.read",
  ROLES_MANAGE: "roles.manage",

  // Notifications & Communication (Phase 25)
  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_MANAGE: "notifications.manage",
  NOTIFICATIONS_RETRY: "notifications.retry",
  NOTIFICATIONS_TEMPLATES_READ: "notifications.templates.read",
  NOTIFICATIONS_TEMPLATES_MANAGE: "notifications.templates.manage",
  NOTIFICATIONS_DELIVERY_READ: "notifications.delivery.read",
  NOTIFICATIONS_PREFERENCES_READ: "notifications.preferences.read",
  NOTIFICATIONS_PREFERENCES_MANAGE: "notifications.preferences.manage",
  NOTIFICATIONS_AUDIT_READ: "notifications.audit.read",

  // Payments (Phase 18)
  PAYMENTS_READ: "payments.read",
  PAYMENTS_RECONCILE: "payments.reconcile",
  PAYMENTS_MANAGE: "payments.manage",

  // Admin & Operations Dashboard (Phase 27)
  DASHBOARD_READ: "admin.dashboard.read",
  DASHBOARD_ANALYTICS_READ: "admin.dashboard.analytics.read",
  SEARCH_GLOBAL: "admin.search.global",

  // System Configuration & Audit (Phase 29)
  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_READ: "audit.read",
  AUDIT_EXPORT: "audit.export",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
