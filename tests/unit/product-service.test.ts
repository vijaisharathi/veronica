/**
 * VÉRONA — Phase 09 Product Service Unit Tests
 *
 * Tests for ProductService domain logic, visibility enforcement, and customer-safe DTO mapping.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "@/modules/catalog/product.service";
import { ProductStatus, ProductVisibility } from "@/constants/status";
import { NotFoundError } from "@/lib/errors";

// Mock dependencies
vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

const mockFindBySlug = vi.fn();
const mockFindById = vi.fn();
const mockFind = vi.fn();
const mockGetVariantsByProductId = vi.fn();
const mockGetVariantsByProductIds = vi.fn();
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();

vi.mock("@/db/repositories/product.repository", () => ({
  productRepository: {
    findBySlug: (...args: unknown[]) => mockFindBySlug(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    find: (...args: unknown[]) => mockFind(...args),
    getVariantsByProductId: (...args: unknown[]) => mockGetVariantsByProductId(...args),
    getVariantsByProductIds: (...args: unknown[]) => mockGetVariantsByProductIds(...args),
    createProduct: (...args: unknown[]) => mockCreateProduct(...args),
    updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  },
}));

vi.mock("@/db/models", () => ({
  BrandModel: {
    findById: vi.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
    find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
  },
  CategoryModel: {
    findById: vi.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
    find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
  },
  FashionCollectionModel: {
    findById: vi.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
    find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
    findOne: vi.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
  },
  ProductVariantModel: {
    find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
  },
  ProductModel: {
    find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
  },
}));

const makeMockProduct = (overrides = {}) => ({
  _id: "prod-123",
  name: "Handwoven Cotton Shirt",
  slug: "handwoven-cotton-shirt",
  description: "Pure handcrafted cotton garment.",
  status: ProductStatus.PUBLISHED,
  visibility: ProductVisibility.PUBLIC,
  gender: "MEN",
  productType: "SHIRT",
  categoryIds: ["cat-1"],
  collectionIds: ["col-1"],
  brandId: null,
  tags: ["handwoven"],
  media: [{ url: "/images/shirt.jpg", isPrimary: true, sortOrder: 0 }],
  attributes: [],
  isDeleted: false,
  featured: false,
  bestseller: false,
  newArrival: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeMockVariant = (overrides = {}) => ({
  _id: "var-1",
  productId: "prod-123",
  sku: "VER-MEN-SHT-WHT-M",
  size: "M",
  color: { name: "White", slug: "white", hexCode: "#FFFFFF" },
  mrp: 399900,
  sellingPrice: 349900,
  variantImages: ["/images/shirt-wht.jpg"],
  status: "ACTIVE",
  active: true,
  isDeleted: false,
  ...overrides,
});

describe("ProductService (Phase 09)", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
  });

  describe("getProductBySlug", () => {
    it("returns product DTO and related products for active public product", async () => {
      const mockProduct = makeMockProduct();
      const mockVariant = makeMockVariant();

      mockFindBySlug.mockResolvedValue(mockProduct);
      mockGetVariantsByProductId.mockResolvedValue([mockVariant]);
      mockFind.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 4,
        totalPages: 0,
        hasMore: false,
      });

      const result = await service.getProductBySlug("handwoven-cotton-shirt");

      expect(result).toBeDefined();
      expect(result.product.id).toBe("prod-123");
      expect(result.product.name).toBe("Handwoven Cotton Shirt");
      expect(result.product.pricing.currentPrice).toBe(3499);
      expect(result.product.pricing.mrp).toBe(3999);
      expect(result.product.availability.inStock).toBe(true);
      expect(result.breadcrumbs).toBeDefined();
    });

    it("throws NotFoundError when product does not exist", async () => {
      mockFindBySlug.mockResolvedValue(null);

      await expect(
        service.getProductBySlug("non-existent-product")
      ).rejects.toThrow(NotFoundError);
    });

    it("enforces server-side visibility by throwing NotFoundError for DRAFT products", async () => {
      const draftProduct = makeMockProduct({ status: ProductStatus.DRAFT });
      mockFindBySlug.mockResolvedValue(draftProduct);

      await expect(
        service.getProductBySlug("handwoven-cotton-shirt")
      ).rejects.toThrow(NotFoundError);
    });

    it("enforces server-side visibility by throwing NotFoundError for HIDDEN products", async () => {
      const hiddenProduct = makeMockProduct({
        visibility: ProductVisibility.HIDDEN,
      });
      mockFindBySlug.mockResolvedValue(hiddenProduct);

      await expect(
        service.getProductBySlug("handwoven-cotton-shirt")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("toProductDTO presentation sanitizer", () => {
    it("maps raw documents to customer-safe DTO without leaking internal cost or notes", () => {
      const rawProduct = makeMockProduct({
        internalCost: 1500,
        supplierNotes: "Confidential supplier info",
      });
      const rawVariant = makeMockVariant();

      const dto = service.toProductDTO(
        rawProduct as any,
        [rawVariant as any],
        null,
        [],
        []
      );

      expect(dto.id).toBe("prod-123");
      expect((dto as any).internalCost).toBeUndefined();
      expect((dto as any).supplierNotes).toBeUndefined();
      expect(dto.pricing.hasDiscount).toBe(true);
      expect(dto.pricing.discountPercent).toBeGreaterThan(0);
    });

    it("calculates accurate availability and price ranges across multiple variants", () => {
      const rawProduct = makeMockProduct();
      const variant1 = makeMockVariant({
        _id: "v1",
        size: "S",
        mrp: 399900,
        sellingPrice: 299900,
        status: "ACTIVE",
      });
      const variant2 = makeMockVariant({
        _id: "v2",
        size: "L",
        mrp: 399900,
        sellingPrice: 349900,
        status: "ACTIVE",
      });

      const dto = service.toProductDTO(
        rawProduct as any,
        [variant1 as any, variant2 as any],
        null,
        [],
        []
      );

      expect(dto.pricing.isPriceRange).toBe(true);
      expect(dto.pricing.minPrice).toBe(2999);
      expect(dto.pricing.maxPrice).toBe(3499);
      expect(dto.availability.inStock).toBe(true);
    });
  });
});
