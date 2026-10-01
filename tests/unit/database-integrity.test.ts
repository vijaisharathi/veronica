import { describe, it, expect } from "vitest";
import {
  ProductVariantSchema,
  InventoryItemSchema,
  StockReservationSchema,
  WishlistItemSchema,
  ReviewSchema,
  CategorySchema,
  CustomerSchema,
} from "@/db/schemas";
import { getConnectionState, connectToDatabase, checkDatabaseHealth } from "@/db/client";
import {
  productRepository,
  categoryRepository,
  customerRepository,
  orderRepository,
  inventoryRepository,
  cartRepository,
  wishlistRepository,
} from "@/db/repositories";

describe("Database Index & Integrity Specifications Suite", () => {
  describe("Compound Indexes & Unique Constraints Verification", () => {
    it("should define compound unique index on ProductVariant for { productId, color.name, size }", () => {
      const indexes = ProductVariantSchema.indexes();
      const variantCompoundIndex = indexes.find(
        ([fields, options]) =>
          fields.productId === 1 &&
          fields["color.name"] === 1 &&
          fields.size === 1 &&
          options?.unique === true
      );

      expect(variantCompoundIndex).toBeDefined();
    });

    it("should define compound unique index on InventoryItem for { warehouseId, variantId }", () => {
      const indexes = InventoryItemSchema.indexes();
      const invCompoundIndex = indexes.find(
        ([fields, options]) =>
          fields.warehouseId === 1 &&
          fields.variantId === 1 &&
          options?.unique === true
      );

      expect(invCompoundIndex).toBeDefined();
    });

    it("should define compound unique index on WishlistItem for { customerId, productId, variantId }", () => {
      const indexes = WishlistItemSchema.indexes();
      const wishlistCompoundIndex = indexes.find(
        ([fields, options]) =>
          fields.customerId === 1 &&
          fields.productId === 1 &&
          fields.variantId === 1 &&
          options?.unique === true
      );

      expect(wishlistCompoundIndex).toBeDefined();
    });

    it("should define TTL index on StockReservation expiresAt", () => {
      const path = StockReservationSchema.path("expiresAt");
      // Mongoose index option can be checked directly or via schema.indexes()
      const indexes = StockReservationSchema.indexes();
      const ttlIndex = indexes.find(
        ([fields, options]) => fields.expiresAt !== undefined && (options?.expires !== undefined || options?.expireAfterSeconds !== undefined)
      );

      // Either in indexes() or declared on path
      const hasTtl = !!ttlIndex || !!(path as unknown as { options?: { index?: { expires?: string } } })?.options?.index?.expires;
      expect(hasTtl).toBe(true);
    });

    it("should define compound unique sparse index on Review for { customerId, productId, orderItemId }", () => {
      const indexes = ReviewSchema.indexes();
      const reviewIndex = indexes.find(
        ([fields, options]) =>
          fields.customerId === 1 &&
          fields.productId === 1 &&
          fields.orderItemId === 1 &&
          options?.unique === true &&
          options?.sparse === true
      );

      expect(reviewIndex).toBeDefined();
    });

    it("should define parentId and active compound index on Category for hierarchical traversal", () => {
      const indexes = CategorySchema.indexes();
      const categoryHierarchyIndex = indexes.find(
        ([fields]) => fields.parentId === 1 && fields.active === 1 && fields.sortOrder === 1
      );

      expect(categoryHierarchyIndex).toBeDefined();
    });

    it("should enforce lowercase and unique constraint on Customer email", () => {
      const emailPath = CustomerSchema.path("email") as unknown as {
        options: { unique: boolean; lowercase: boolean; required: boolean };
      };
      expect(emailPath.options.unique).toBe(true);
      expect(emailPath.options.lowercase).toBe(true);
      expect(emailPath.options.required).toBe(true);
    });
  });

  describe("Database Client & Health Telemetry", () => {
    it("should return valid connection state without forcing connection", () => {
      const state = getConnectionState();
      expect(typeof state.isConnected).toBe("boolean");
      expect(typeof state.readyState).toBe("number");
      expect(typeof state.stateName).toBe("string");
    });

    it("should assess database health gracefully", async () => {
      const health = await checkDatabaseHealth();
      expect(typeof health.connected).toBe("boolean");
      expect(typeof health.stateName).toBe("string");
      expect(health.latencyMs === null || typeof health.latencyMs === "number").toBe(true);
    });

    it("should throw a descriptive error when DATABASE_URL is missing", async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      await expect(connectToDatabase()).rejects.toThrow("DATABASE_URL environment variable is missing");

      process.env.DATABASE_URL = originalUrl;
    });
  });

  describe("Repository Layer Contracts Verification", () => {
    it("should expose all required ProductRepository methods", () => {
      expect(typeof productRepository.findBySlug).toBe("function");
      expect(typeof productRepository.findById).toBe("function");
      expect(typeof productRepository.findPaginated).toBe("function");
      expect(typeof productRepository.getVariantsByProductId).toBe("function");
      expect(typeof productRepository.findVariantBySku).toBe("function");
      expect(typeof productRepository.softDelete).toBe("function");
    });

    it("should expose all required CategoryRepository methods", () => {
      expect(typeof categoryRepository.findBySlug).toBe("function");
      expect(typeof categoryRepository.findById).toBe("function");
      expect(typeof categoryRepository.findRootCategories).toBe("function");
      expect(typeof categoryRepository.findSubcategories).toBe("function");
      expect(typeof categoryRepository.getCategoryTree).toBe("function");
    });

    it("should expose all required CustomerRepository methods", () => {
      expect(typeof customerRepository.findById).toBe("function");
      expect(typeof customerRepository.findByEmail).toBe("function");
      expect(typeof customerRepository.findByAuthProviderId).toBe("function");
      expect(typeof customerRepository.updatePreferences).toBe("function");
    });

    it("should expose all required OrderRepository methods", () => {
      expect(typeof orderRepository.findByOrderNumber).toBe("function");
      expect(typeof orderRepository.findById).toBe("function");
      expect(typeof orderRepository.findByCustomerId).toBe("function");
      expect(typeof orderRepository.getStatusHistory).toBe("function");
      expect(typeof orderRepository.recordStatusChange).toBe("function");
    });

    it("should expose all required InventoryRepository methods", () => {
      expect(typeof inventoryRepository.getVariantTotalAvailableStock).toBe("function");
      expect(typeof inventoryRepository.getWarehouseStock).toBe("function");
      expect(typeof inventoryRepository.getStockMovements).toBe("function");
      expect(typeof inventoryRepository.recordMovement).toBe("function");
      expect(typeof inventoryRepository.getActiveReservations).toBe("function");
    });

    it("should expose all required CartRepository methods", () => {
      expect(typeof cartRepository.findActiveCartByCustomerId).toBe("function");
      expect(typeof cartRepository.findActiveCartBySessionId).toBe("function");
      expect(typeof cartRepository.getCartItems).toBe("function");
      expect(typeof cartRepository.getCartWithItems).toBe("function");
      expect(typeof cartRepository.clearCartItems).toBe("function");
    });

    it("should expose all required WishlistRepository methods", () => {
      expect(typeof wishlistRepository.getOrCreateCustomerWishlist).toBe("function");
      expect(typeof wishlistRepository.getWishlistItems).toBe("function");
      expect(typeof wishlistRepository.isInWishlist).toBe("function");
      expect(typeof wishlistRepository.addItem).toBe("function");
      expect(typeof wishlistRepository.removeItem).toBe("function");
    });
  });
});
