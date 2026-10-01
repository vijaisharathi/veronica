import { describe, it, expect } from "vitest";
import {
  CustomerModel,
  ProductModel,
  ProductVariantModel,
  InventoryItemModel,
  CartItemModel,
  ReviewModel,
  OrderModel,
  AuditLogModel,
  StockReservationModel,
  CategoryModel,
} from "@/db/models";
import {
  CustomerStatus,
  ProductStatus,
  VariantStatus,
  InventoryStatus,
  OrderStatus,
  PaymentStatus,
  AuditActorType,
  Gender,
} from "@/constants/status";
import mongoose from "mongoose";

describe("Database Schemas & Data Model Validation Suite", () => {
  describe("Customer Model Validation", () => {
    it("should accept valid customer document", async () => {
      const validCustomer = new CustomerModel({
        email: "test@example.com",
        firstName: "Aria",
        lastName: "Sharma",
        displayName: "Aria Sharma",
        status: CustomerStatus.ACTIVE,
        preferences: { marketingEmail: true, marketingSms: false, marketingWhatsapp: false },
      });

      const err = await validCustomer.validate();
      expect(err).toBeUndefined();
    });

    it("should reject customer with missing required fields", async () => {
      const invalidCustomer = new CustomerModel({});
      const err = await invalidCustomer.validate().catch((e) => e);

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.email).toBeDefined();
      expect(err.errors.firstName).toBeDefined();
      expect(err.errors.lastName).toBeDefined();
    });

    it("should reject customer with invalid status enum", async () => {
      const invalidCustomer = new CustomerModel({
        email: "test@example.com",
        firstName: "Aria",
        lastName: "Sharma",
        displayName: "Aria",
        status: "INVALID_STATUS",
      });

      const err = await invalidCustomer.validate().catch((e) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.status).toBeDefined();
    });
  });

  describe("Product & ProductVariant Validation", () => {
    it("should accept valid product document", async () => {
      const validProduct = new ProductModel({
        name: "Silk Evening Gown",
        slug: "silk-evening-gown",
        description: "Pure silk gown",
        brandId: new mongoose.Types.ObjectId(),
        categoryIds: [new mongoose.Types.ObjectId()],
        gender: Gender.WOMEN,
        productType: "Gown",
        status: ProductStatus.PUBLISHED,
        images: [{ url: "https://example.com/image.jpg", isPrimary: true }],
      });

      const err = await validProduct.validate();
      expect(err).toBeUndefined();
    });

    it("should reject product with missing required brandId and categoryIds", async () => {
      const invalidProduct = new ProductModel({
        name: "Incomplete Product",
        slug: "incomplete",
        description: "Missing relations",
        gender: Gender.WOMEN,
        productType: "Dress",
      });

      const err = await invalidProduct.validate().catch((e) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.brandId).toBeDefined();
      expect(err.errors.categoryIds).toBeDefined();
    });

    it("should reject product variant with non-integer floating point prices", async () => {
      const variantWithFloatPrice = new ProductVariantModel({
        productId: new mongoose.Types.ObjectId(),
        sku: "VER-FLT-001",
        color: { name: "Black", slug: "black", hexCode: "#000000" },
        size: "M",
        mrp: 1299.5, // Invalid float! Must be integer minor units (paise)
        sellingPrice: 999.99,
        status: VariantStatus.ACTIVE,
      });

      const err = await variantWithFloatPrice.validate().catch((e) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.mrp).toBeDefined();
      expect(err.errors.sellingPrice).toBeDefined();
    });

    it("should accept product variant with valid integer minor units", async () => {
      const validVariant = new ProductVariantModel({
        productId: new mongoose.Types.ObjectId(),
        sku: "VER-VALID-001",
        color: { name: "Black", slug: "black", hexCode: "#000000" },
        size: "M",
        mrp: 129950, // ₹1,299.50 in paise
        sellingPrice: 99900, // ₹999.00 in paise
        status: VariantStatus.ACTIVE,
      });

      const err = await validVariant.validate();
      expect(err).toBeUndefined();
    });
  });

  describe("Inventory Constraints & Validation", () => {
    it("should reject negative availableQuantity in inventory", async () => {
      const negativeInventory = new InventoryItemModel({
        warehouseId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        availableQuantity: -5,
        reservedQuantity: 0,
        damagedQuantity: 0,
        status: InventoryStatus.OUT_OF_STOCK,
      });

      const err = await negativeInventory.validate().catch((e) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.availableQuantity).toBeDefined();
    });

    it("should reject negative reservedQuantity in inventory", async () => {
      const negativeReserved = new InventoryItemModel({
        warehouseId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        availableQuantity: 10,
        reservedQuantity: -2,
        damagedQuantity: 0,
        status: InventoryStatus.IN_STOCK,
      });

      const err = await negativeReserved.validate().catch((e) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.reservedQuantity).toBeDefined();
    });

    it("should accept valid non-negative inventory quantities", async () => {
      const validInventory = new InventoryItemModel({
        warehouseId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        availableQuantity: 25,
        reservedQuantity: 5,
        damagedQuantity: 0,
        incomingQuantity: 10,
        reorderLevel: 5,
        status: InventoryStatus.IN_STOCK,
      });

      const err = await validInventory.validate();
      expect(err).toBeUndefined();
    });
  });

  describe("Cart & Order Snapshot Validation", () => {
    it("should reject cart item with quantity less than 1", async () => {
      const invalidCartItem = new CartItemModel({
        cartId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        variantId: new mongoose.Types.ObjectId(),
        quantity: 0,
        unitPriceSnapshot: 499900,
        productNameSnapshot: "Dress",
        variantSnapshot: { color: "Black", size: "M", sku: "SKU-001" },
        imageSnapshot: "https://example.com/img.jpg",
      });

      const err = await invalidCartItem.validate().catch((e) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.quantity).toBeDefined();
    });

    it("should reject order with empty items array", async () => {
      const emptyOrder = new OrderModel({
        orderNumber: "VER-ORD-001",
        customerId: new mongoose.Types.ObjectId(),
        email: "customer@example.com",
        phone: "+919876543210",
        items: [],
        pricing: {
          subtotal: 0,
          discount: 0,
          shipping: 0,
          tax: 0,
          total: 0,
          currency: "INR",
        },
        shippingAddress: {
          fullName: "Aria Sharma",
          phone: "+919876543210",
          addressLine1: "123 High Street",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          pincode: "400001",
        },
        billingAddress: {
          fullName: "Aria Sharma",
          phone: "+919876543210",
          addressLine1: "123 High Street",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          pincode: "400001",
        },
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
      });

      const err = await emptyOrder.validate().catch((e) => e);
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.items).toBeDefined();
    });

    it("should accept order with complete historical snapshot", async () => {
      const validOrder = new OrderModel({
        orderNumber: "VER-ORD-2026-0001",
        customerId: new mongoose.Types.ObjectId(),
        email: "customer@example.com",
        phone: "+919876543210",
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantId: new mongoose.Types.ObjectId(),
            sku: "VER-W-DRS-BLK-M",
            productName: "Silk Evening Gown",
            brandName: "VÉRONA Atelier",
            size: "M",
            color: "Obsidian Black",
            image: "https://example.com/gown.jpg",
            quantity: 1,
            unitPrice: 599900,
            discount: 0,
            tax: 71988,
            finalPrice: 671888,
          },
        ],
        pricing: {
          subtotal: 599900,
          discount: 0,
          shipping: 0,
          tax: 71988,
          total: 671888,
          currency: "INR",
        },
        shippingAddress: {
          fullName: "Aria Sharma",
          phone: "+919876543210",
          addressLine1: "123 High Street",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          pincode: "400001",
        },
        billingAddress: {
          fullName: "Aria Sharma",
          phone: "+919876543210",
          addressLine1: "123 High Street",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          pincode: "400001",
        },
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
      });

      const err = await validOrder.validate();
      expect(err).toBeUndefined();
    });
  });

  describe("Review & Audit Log Validation", () => {
    it("should reject review with rating greater than 5 or less than 1", async () => {
      const invalidRatingHigh = new ReviewModel({
        customerId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        rating: 6,
        title: "Too good",
        comment: "Exceeded rating",
      });
      const errHigh = await invalidRatingHigh.validate().catch((e) => e);
      expect(errHigh).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(errHigh.errors.rating).toBeDefined();

      const invalidRatingLow = new ReviewModel({
        customerId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        rating: 0,
        title: "Too low",
        comment: "Under rating",
      });
      const errLow = await invalidRatingLow.validate().catch((e) => e);
      expect(errLow).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(errLow.errors.rating).toBeDefined();
    });

    it("should accept valid review with integer rating 1-5", async () => {
      const validReview = new ReviewModel({
        customerId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        rating: 5,
        title: "Exquisite craftsmanship",
        comment: "The drape and silk quality exceeded expectations.",
      });

      const err = await validReview.validate();
      expect(err).toBeUndefined();
    });

    it("should accept valid audit log entry with actorType", async () => {
      const validAudit = new AuditLogModel({
        actorId: "staff_001",
        actorType: AuditActorType.STAFF,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: "prod_001",
        before: null,
        after: { name: "Silk Gown" },
      });

      const err = await validAudit.validate();
      expect(err).toBeUndefined();
    });
  });
});
