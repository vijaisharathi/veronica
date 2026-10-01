import { describe, it, expect, vi, beforeEach } from "vitest";
import { cartService } from "@/modules/cart/cart.service";
import { cartRepository } from "@/db/repositories/cart.repository";
import { productRepository } from "@/db/repositories/product.repository";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { ProductModel, ProductVariantModel, BrandModel } from "@/db/models";
import { CartStatus, ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { NotFoundError, ValidationError, AuthorizationError, ConflictError } from "@/lib/errors";
import { MAX_CART_ITEM_QUANTITY } from "@/config/cart";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/repositories/cart.repository", () => ({
  cartRepository: {
    findActiveCart: vi.fn(),
    findActiveCartByCustomerId: vi.fn(),
    findActiveCartBySessionId: vi.fn(),
    createActiveCart: vi.fn(),
    getCartWithItems: vi.fn(),
    getCartItems: vi.fn(),
    findCartItemByVariant: vi.fn(),
    findCartItemById: vi.fn(),
    createCartItem: vi.fn(),
    updateCartItem: vi.fn(),
    deleteCartItem: vi.fn(),
    clearCartItems: vi.fn(),
    updateCartTotals: vi.fn(),
    setCartCoupon: vi.fn(),
    mergeGuestCartItems: vi.fn(),
    updateCartStatus: vi.fn(),
  },
}));

vi.mock("@/db/repositories/product.repository", () => ({
  productRepository: {
    findById: vi.fn(),
    findVariantById: vi.fn(),
  },
}));

vi.mock("@/modules/wishlist/wishlist.service", () => ({
  wishlistService: {
    addToWishlist: vi.fn(),
  },
}));

vi.mock("@/db/models", () => ({
  ProductModel: {
    find: vi.fn(),
    findById: vi.fn(),
  },
  ProductVariantModel: {
    find: vi.fn(),
  },
  BrandModel: {
    find: vi.fn(),
  },
  CampaignModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  CouponModel: {
    findOne: vi.fn(),
  },
  CouponUsageModel: {
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
  },
}));

describe("Phase 14 — Cart Domain Service Unit Tests", () => {
  const customerId = "507f1f77bcf86cd799439011";
  const guestSessionId = "guest-session-uuid-123";
  const cartId = "507f1f77bcf86cd799439012";
  const productId = "507f1f77bcf86cd799439013";
  const variantId = "507f1f77bcf86cd799439014";
  const itemId = "507f1f77bcf86cd799439015";
  const brandId = "507f1f77bcf86cd799439016";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreateActiveCart", () => {
    it("should return existing active cart if present", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);

      const result = await cartService.getOrCreateActiveCart({ customerId });
      expect(result).toBe(mockCart);
      expect(cartRepository.findActiveCart).toHaveBeenCalledWith({ customerId });
      expect(cartRepository.createActiveCart).not.toHaveBeenCalled();
    });

    it("should create new active cart if none exists", async () => {
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(null);
      const mockNewCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.createActiveCart).mockResolvedValue(mockNewCart as any);

      const result = await cartService.getOrCreateActiveCart({ customerId });
      expect(result).toBe(mockNewCart);
      expect(cartRepository.createActiveCart).toHaveBeenCalledWith({ customerId });
    });
  });

  describe("getCart", () => {
    it("should return empty CartDTO when no active cart exists", async () => {
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(null);

      const result = await cartService.getCart({ customerId });
      expect(result.items).toEqual([]);
      expect(result.itemCount).toBe(0);
      expect(result.totals.subtotalMinor).toBe(0);
      expect(result.totals.currency).toBe("INR");
    });

    it("should hydrate cart items with batch querying and zero N+1 queries", async () => {
      const mockCart = {
        _id: cartId,
        customerId,
        status: CartStatus.ACTIVE,
        subtotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);

      const mockCartItem = {
        _id: itemId,
        cartId,
        productId,
        variantId,
        quantity: 2,
        unitPriceSnapshot: 450000, // 4500.00 INR
        productNameSnapshot: "Tailored Silk Shirt",
        variantSnapshot: { color: "Ivory", size: "M", sku: "TSS-IVR-M" },
        imageSnapshot: "/images/shirt-ivory.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [mockCartItem],
      } as any);

      // Product and Variant batch finds
      const mockProduct = {
        _id: productId,
        name: "Tailored Silk Shirt",
        slug: "tailored-silk-shirt",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
        brandId,
        primaryImage: "/images/shirt-primary.jpg",
      };
      const mockVariant = {
        _id: variantId,
        productId,
        sku: "TSS-IVR-M",
        color: { name: "Ivory", hex: "#FFFFF0" },
        size: "M",
        sellingPrice: 450000,
        mrp: 500000,
        active: true,
        status: VariantStatus.ACTIVE,
        available: true,
        variantImages: ["/images/shirt-ivory.jpg"],
      };
      const mockBrand = { _id: brandId, name: "VÉRONA ATELIER" };

      vi.mocked(ProductModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockProduct]),
      } as any);
      vi.mocked(ProductVariantModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockVariant]),
      } as any);
      vi.mocked(BrandModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockBrand]),
      } as any);

      const result = await cartService.getCart({ customerId });

      expect(ProductModel.find).toHaveBeenCalledWith({ _id: { $in: [productId] } });
      expect(ProductVariantModel.find).toHaveBeenCalledWith({ _id: { $in: [variantId] } });
      expect(result.items).toHaveLength(1);
      expect(result.itemCount).toBe(2);
      const item0 = result.items[0]!;
      expect(item0.productName).toBe("Tailored Silk Shirt");
      expect(item0.brand).toBe("VÉRONA ATELIER");
      expect(item0.unitPriceMinor).toBe(450000);
      expect(item0.unitPriceMajor).toBe(4500);
      expect(item0.lineTotalMinor).toBe(900000); // 450000 * 2
      expect(item0.lineTotalMajor).toBe(9000);
      expect(result.totals.subtotalMinor).toBe(900000);
      expect(result.totals.subtotalMajor).toBe(9000);
      expect(item0.availability).toBe("AVAILABLE");
      expect(item0.priceChanged).toBe(false);
    });

    it("should detect catalog price changes and surface previous price snapshot", async () => {
      const mockCart = {
        _id: cartId,
        customerId,
        status: CartStatus.ACTIVE,
        subtotal: 79900,
      };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);

      const mockCartItem = {
        _id: itemId,
        cartId,
        productId,
        variantId,
        quantity: 1,
        unitPriceSnapshot: 79900, // Was 799.00
      };
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [mockCartItem],
      } as any);

      // Variant price has increased to 89900
      const mockVariant = {
        _id: variantId,
        productId,
        sellingPrice: 89900,
        active: true,
        status: VariantStatus.ACTIVE,
        available: true,
      };

      vi.mocked(ProductModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: productId,
            name: "Classic Tee",
            status: ProductStatus.PUBLISHED,
            visibility: ProductVisibility.PUBLIC,
            isDeleted: false,
          },
        ]),
      } as any);
      vi.mocked(ProductVariantModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockVariant]),
      } as any);
      vi.mocked(BrandModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await cartService.getCart({ customerId });

      expect(result.hasPriceChanges).toBe(true);
      const changedItem = result.items[0]!;
      expect(changedItem.priceChanged).toBe(true);
      expect(changedItem.previousPriceMinor).toBe(79900);
      expect(changedItem.previousPriceMajor).toBe(799);
      expect(changedItem.unitPriceMinor).toBe(89900);
      expect(changedItem.unitPriceMajor).toBe(899);
      expect(changedItem.availability).toBe("PRICE_CHANGED");
      expect(result.totals.subtotalMinor).toBe(89900);
      expect(cartRepository.updateCartTotals).toHaveBeenCalledWith(cartId, {
        subtotal: 89900,
        total: 89900,
      });
    });

    it("should mark item as PRODUCT_UNAVAILABLE if product is unpublished or deleted", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);

      const mockCartItem = {
        _id: itemId,
        cartId,
        productId,
        variantId,
        quantity: 1,
        unitPriceSnapshot: 500000,
      };
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [mockCartItem],
      } as any);

      // Product is unpublished
      vi.mocked(ProductModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: productId,
            name: "Archived Blazer",
            status: ProductStatus.ARCHIVED,
            visibility: ProductVisibility.PUBLIC,
            isDeleted: false,
          },
        ]),
      } as any);
      vi.mocked(ProductVariantModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);
      vi.mocked(BrandModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await cartService.getCart({ customerId });

      expect(result.hasUnavailableItems).toBe(true);
      expect(result.items[0]!.availability).toBe("PRODUCT_UNAVAILABLE");
    });
  });

  describe("addItem", () => {
    const validInput = {
      productId,
      variantId,
      quantity: 1,
    };

    it("should reject non-existent or unpublished product with NotFoundError", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(null);

      await expect(cartService.addItem({ customerId }, validInput)).rejects.toThrow(NotFoundError);
    });

    it("should reject non-existent or inactive variant with NotFoundError", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue({
        _id: productId,
        name: "Linen Trousers",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
      } as any);
      vi.mocked(productRepository.findVariantById).mockResolvedValue(null);

      await expect(cartService.addItem({ customerId }, validInput)).rejects.toThrow(NotFoundError);
    });

    it("should reject out of stock variant with ConflictError", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue({
        _id: productId,
        name: "Linen Trousers",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
      } as any);
      vi.mocked(productRepository.findVariantById).mockResolvedValue({
        _id: variantId,
        productId,
        active: true,
        status: VariantStatus.ACTIVE,
        available: false, // out of stock
      } as any);

      await expect(cartService.addItem({ customerId }, validInput)).rejects.toThrow(ConflictError);
    });

    it("should add new item when variant not in cart", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue({
        _id: productId,
        name: "Linen Trousers",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
        primaryImage: "/images/pants.jpg",
      } as any);
      vi.mocked(productRepository.findVariantById).mockResolvedValue({
        _id: variantId,
        productId,
        sku: "LT-BLK-32",
        color: { name: "Black" },
        size: "32",
        sellingPrice: 350000,
        active: true,
        status: VariantStatus.ACTIVE,
        available: true,
        variantImages: ["/images/pants-black.jpg"],
      } as any);

      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemByVariant).mockResolvedValue(null);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await cartService.addItem({ customerId }, validInput);

      expect(cartRepository.createCartItem).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId,
          productId,
          variantId,
          quantity: 1,
          unitPriceSnapshot: 350000,
          productNameSnapshot: "Linen Trousers",
        })
      );
    });

    it("should merge quantities when variant already exists in cart", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue({
        _id: productId,
        name: "Linen Trousers",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
      } as any);
      vi.mocked(productRepository.findVariantById).mockResolvedValue({
        _id: variantId,
        productId,
        sellingPrice: 350000,
        active: true,
        status: VariantStatus.ACTIVE,
        available: true,
      } as any);

      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemByVariant).mockResolvedValue({
        _id: itemId,
        cartId,
        productId,
        variantId,
        quantity: 2,
      } as any);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await cartService.addItem({ customerId }, { ...validInput, quantity: 3 });

      expect(cartRepository.updateCartItem).toHaveBeenCalledWith(itemId, {
        quantity: 5,
        unitPriceSnapshot: 350000,
      });
      expect(cartRepository.createCartItem).not.toHaveBeenCalled();
    });

    it("should reject addition if merged quantity exceeds MAX_CART_ITEM_QUANTITY", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue({
        _id: productId,
        name: "Linen Trousers",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
      } as any);
      vi.mocked(productRepository.findVariantById).mockResolvedValue({
        _id: variantId,
        productId,
        sellingPrice: 350000,
        active: true,
        status: VariantStatus.ACTIVE,
        available: true,
      } as any);

      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemByVariant).mockResolvedValue({
        _id: itemId,
        cartId,
        productId,
        variantId,
        quantity: 8,
      } as any);

      // Adding 4 to existing 8 = 12 > MAX (10)
      await expect(
        cartService.addItem({ customerId }, { ...validInput, quantity: 4 })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updateItemQuantity", () => {
    it("should reject update if item does not belong to user cart (IDOR protection)", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);

      // Item belongs to a different cart
      vi.mocked(cartRepository.findCartItemById).mockResolvedValue({
        _id: itemId,
        cartId: "different-cart-id",
        quantity: 1,
      } as any);

      await expect(
        cartService.updateItemQuantity({ customerId }, itemId, 3)
      ).rejects.toThrow(AuthorizationError);
    });

    it("should remove item when quantity is set to 0", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemById).mockResolvedValue({
        _id: itemId,
        cartId,
        quantity: 2,
      } as any);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await cartService.updateItemQuantity({ customerId }, itemId, 0);

      expect(cartRepository.deleteCartItem).toHaveBeenCalledWith(itemId);
      expect(cartRepository.updateCartItem).not.toHaveBeenCalled();
    });

    it("should update item quantity when positive integer within bounds", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemById).mockResolvedValue({
        _id: itemId,
        cartId,
        quantity: 2,
      } as any);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await cartService.updateItemQuantity({ customerId }, itemId, 4);

      expect(cartRepository.updateCartItem).toHaveBeenCalledWith(itemId, { quantity: 4 });
    });
  });

  describe("removeItem", () => {
    it("should reject deletion if item does not belong to user cart", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemById).mockResolvedValue({
        _id: itemId,
        cartId: "other-cart",
      } as any);

      await expect(cartService.removeItem({ customerId }, itemId)).rejects.toThrow(
        AuthorizationError
      );
    });

    it("should delete item and return updated cart", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemById).mockResolvedValue({
        _id: itemId,
        cartId,
      } as any);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await cartService.removeItem({ customerId }, itemId);

      expect(cartRepository.deleteCartItem).toHaveBeenCalledWith(itemId);
    });
  });

  describe("clearCart", () => {
    it("should idempotently clear all items from active cart", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await cartService.clearCart({ customerId });

      expect(cartRepository.clearCartItems).toHaveBeenCalledWith(cartId);
    });
  });

  describe("moveToWishlist", () => {
    it("should add to wishlist and delete from cart upon success", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCartByCustomerId).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemById).mockResolvedValue({
        _id: itemId,
        cartId,
        productId,
      } as any);
      vi.mocked(wishlistService.addToWishlist).mockResolvedValue({} as any);
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await cartService.moveToWishlist(customerId, itemId);

      expect(wishlistService.addToWishlist).toHaveBeenCalledWith(customerId, productId);
      expect(cartRepository.deleteCartItem).toHaveBeenCalledWith(itemId);
    });

    it("should not remove from cart if wishlist service throws an error", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCartByCustomerId).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.findCartItemById).mockResolvedValue({
        _id: itemId,
        cartId,
        productId,
      } as any);
      vi.mocked(wishlistService.addToWishlist).mockRejectedValue(new Error("Wishlist failure"));

      await expect(cartService.moveToWishlist(customerId, itemId)).rejects.toThrow(
        "Wishlist failure"
      );
      expect(cartRepository.deleteCartItem).not.toHaveBeenCalled();
    });
  });

  describe("mergeGuestCart", () => {
    it("should delegate merge to repository and return customer cart", async () => {
      const guestCart = { _id: "guest-cart-1", sessionId: guestSessionId };
      const customerCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };

      vi.mocked(cartRepository.findActiveCartBySessionId).mockResolvedValue(guestCart as any);
      vi.mocked(cartRepository.getCartItems).mockResolvedValue([
        { _id: "g-item-1", productId, variantId, quantity: 2 },
      ] as any);
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(customerCart as any);
      vi.mocked(cartRepository.getCartWithItems).mockResolvedValue({
        ...customerCart,
        items: [],
      } as any);

      await cartService.mergeGuestCart(customerId, guestSessionId);

      expect(cartRepository.mergeGuestCartItems).toHaveBeenCalledWith(
        "guest-cart-1",
        cartId,
        MAX_CART_ITEM_QUANTITY
      );
    });
  });

  describe("getCartCount", () => {
    it("should sum quantities of all items in cart", async () => {
      const mockCart = { _id: cartId, customerId, status: CartStatus.ACTIVE };
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(mockCart as any);
      vi.mocked(cartRepository.getCartItems).mockResolvedValue([
        { quantity: 2 },
        { quantity: 3 },
      ] as any);

      const result = await cartService.getCartCount({ customerId });
      expect(result.itemCount).toBe(5);
    });

    it("should return 0 when no active cart exists", async () => {
      vi.mocked(cartRepository.findActiveCart).mockResolvedValue(null);

      const result = await cartService.getCartCount({ customerId });
      expect(result.itemCount).toBe(0);
    });
  });
});
