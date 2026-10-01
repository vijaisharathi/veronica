/**
 * VÉRONA — Admin Product Management & Media Unit Tests (Phase 28)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { mediaService } from "@/modules/catalog/media.service";
import { ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAuditTrail: vi.fn().mockResolvedValue(undefined),
}));

const mockProductFindOne = vi.fn();
const mockProductCreate = vi.fn();
const mockVariantFind = vi.fn();
const mockProductCount = vi.fn();

vi.mock("@/db/models", () => ({
  ProductModel: {
    findOne: (...args: unknown[]) => mockProductFindOne(...args),
    create: (...args: unknown[]) => mockProductCreate(...args),
    countDocuments: (...args: unknown[]) => mockProductCount(...args),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    aggregate: vi.fn().mockResolvedValue([]),
  },
  ProductVariantModel: {
    find: (...args: unknown[]) => {
      const res = mockVariantFind(...args);
      const resolvedPromise = Promise.resolve(res);
      const queryObj: any = {
        then: resolvedPromise.then.bind(resolvedPromise),
        catch: resolvedPromise.catch.bind(resolvedPromise),
        lean: vi.fn().mockImplementation(() => Promise.resolve(res)),
      };
      return queryObj;
    },
  },
  CategoryModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "cat-1", name: "Outerwear" }),
    }),
  },
  BrandModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "brand-1", name: "VÉRONA Atelier" }),
    }),
  },
  FashionCollectionModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

describe("AdminCatalogService — Product Lifecycle & Invariants", () => {
  let service: AdminCatalogService;
  const mockStaff = {
    _id: "staff-001",
    email: "catalog.manager@verona.fashion",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminCatalogService();
  });

  it("fails to publish a product if no category is assigned", async () => {
    mockProductFindOne.mockResolvedValue({
      _id: "prod-1",
      title: "Cashmere Blazer",
      categoryIds: [],
      brandId: "brand-1",
      images: [{ url: "https://example.com/img.jpg" }],
      save: vi.fn(),
    });

    await expect(service.publishProduct("prod-1", mockStaff)).rejects.toThrow(
      "Cannot publish product without at least one category assigned"
    );
  });

  it("fails to publish a product if brand is missing", async () => {
    mockProductFindOne.mockResolvedValue({
      _id: "prod-1",
      title: "Cashmere Blazer",
      categoryIds: ["cat-1"],
      brandId: null,
      images: [{ url: "https://example.com/img.jpg" }],
      save: vi.fn(),
    });

    await expect(service.publishProduct("prod-1", mockStaff)).rejects.toThrow(
      "Cannot publish product without a brand assigned"
    );
  });

  it("fails to publish a product if images array is empty", async () => {
    mockProductFindOne.mockResolvedValue({
      _id: "prod-1",
      title: "Cashmere Blazer",
      categoryIds: ["cat-1"],
      brandId: "brand-1",
      images: [],
      save: vi.fn(),
    });

    await expect(service.publishProduct("prod-1", mockStaff)).rejects.toThrow(
      "Cannot publish product without at least one product image"
    );
  });

  it("fails to publish a product if there are no active variants", async () => {
    mockProductFindOne.mockResolvedValue({
      _id: "prod-1",
      title: "Cashmere Blazer",
      categoryIds: ["cat-1"],
      brandId: "brand-1",
      images: [{ url: "https://example.com/img.jpg" }],
      save: vi.fn(),
    });
    mockVariantFind.mockResolvedValue([]);

    await expect(service.publishProduct("prod-1", mockStaff)).rejects.toThrow(
      "Cannot publish product without at least one active variant"
    );
  });

  it("fails to publish if active variants have zero or negative selling prices", async () => {
    mockProductFindOne.mockResolvedValue({
      _id: "prod-1",
      title: "Cashmere Blazer",
      categoryIds: ["cat-1"],
      brandId: "brand-1",
      images: [{ url: "https://example.com/img.jpg" }],
      save: vi.fn(),
    });
    mockVariantFind.mockResolvedValue([
      { sku: "VER-001", active: true, status: VariantStatus.ACTIVE, sellingPrice: 0 },
    ]);

    await expect(service.publishProduct("prod-1", mockStaff)).rejects.toThrow(
      "Cannot publish product with variants lacking valid selling prices"
    );
  });

  it("successfully publishes a product when all business invariants are met", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const mockDoc = {
      _id: "prod-1",
      title: "Cashmere Blazer",
      categoryIds: ["cat-1"],
      brandId: "brand-1",
      images: [{ url: "https://example.com/img.jpg", isPrimary: true }],
      status: ProductStatus.DRAFT,
      visibility: ProductVisibility.HIDDEN,
      save: saveFn,
      toObject: vi.fn().mockReturnValue({ _id: "prod-1", status: ProductStatus.DRAFT }),
    };

    mockProductFindOne
      .mockResolvedValueOnce(mockDoc) // publish check
      .mockReturnValueOnce({ // getProductDetail
        lean: vi.fn().mockResolvedValue({
          _id: "prod-1",
          title: "Cashmere Blazer",
          slug: "cashmere-blazer",
          categoryIds: ["cat-1"],
          brandId: "brand-1",
          images: [{ url: "https://example.com/img.jpg" }],
          status: ProductStatus.PUBLISHED,
          visibility: ProductVisibility.PUBLIC,
        }),
      });

    mockVariantFind.mockResolvedValue([
      {
        _id: "var-1",
        productId: "prod-1",
        sku: "VER-001",
        active: true,
        status: VariantStatus.ACTIVE,
        sellingPrice: 15000,
        mrp: 18000,
        color: { name: "Navy" },
        size: { type: "LETTER", value: "M" },
      },
    ]);

    const result = await service.publishProduct("prod-1", mockStaff);

    expect(mockDoc.status).toBe(ProductStatus.PUBLISHED);
    expect(mockDoc.visibility).toBe(ProductVisibility.PUBLIC);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("prod-1");
  });

  it("unpublishes a product by reverting to DRAFT and hidden visibility", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const mockDoc = {
      _id: "prod-1",
      title: "Cashmere Blazer",
      status: ProductStatus.PUBLISHED,
      visibility: ProductVisibility.PUBLIC,
      save: saveFn,
      toObject: vi.fn().mockReturnValue({ _id: "prod-1", status: ProductStatus.PUBLISHED }),
    };

    mockProductFindOne
      .mockResolvedValueOnce(mockDoc)
      .mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          _id: "prod-1",
          status: ProductStatus.DRAFT,
          visibility: ProductVisibility.HIDDEN,
        }),
      });

    mockVariantFind.mockResolvedValue([]);

    await service.unpublishProduct("prod-1", mockStaff);

    expect(mockDoc.status).toBe(ProductStatus.DRAFT);
    expect(mockDoc.visibility).toBe(ProductVisibility.HIDDEN);
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  it("archives a product and soft-deletes safely", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const mockDoc = {
      _id: "prod-1",
      isDeleted: false,
      status: ProductStatus.DRAFT,
      save: saveFn,
    };

    mockProductFindOne.mockResolvedValue(mockDoc);

    const archived = await service.archiveProduct("prod-1", mockStaff);

    expect(archived).toBe(true);
    expect(mockDoc.isDeleted).toBe(true);
    expect(mockDoc.status).toBe(ProductStatus.ARCHIVED);
    expect(saveFn).toHaveBeenCalledTimes(1);
  });
});

describe("MediaService — Validation & Gallery Constraints", () => {
  it("rejects non-https / invalid protocol URLs", () => {
    expect(() =>
      mediaService.validateMedia({ url: "ftp://storage.com/image.jpg" })
    ).toThrow("Media URL must use a secure protocol (https)");
  });

  it("rejects unsupported MIME types", () => {
    expect(() =>
      mediaService.validateMedia({
        url: "https://example.com/asset.exe",
        mimeType: "application/x-msdownload",
      })
    ).toThrow("Unsupported media MIME type");
  });

  it("rejects oversized images exceeding 5MB limit", () => {
    expect(() =>
      mediaService.validateMedia({
        url: "https://example.com/huge.png",
        sizeBytes: 6 * 1024 * 1024,
      })
    ).toThrow("File size exceeds maximum allowed limit of 5 MB");
  });

  it("accepts valid WebP media asset within limit", () => {
    expect(() =>
      mediaService.validateMedia({
        url: "https://res.cloudinary.com/verona/silk-shirt.webp",
        mimeType: "image/webp",
        sizeBytes: 1.2 * 1024 * 1024,
        alt: "Model wearing mulberry silk shirt",
      })
    ).not.toThrow();
  });

  it("rejects product gallery with multiple primary images", () => {
    expect(() =>
      mediaService.validateProductGallery([
        { url: "https://example.com/img1.jpg", isPrimary: true },
        { url: "https://example.com/img2.jpg", isPrimary: true },
      ])
    ).toThrow("Product gallery cannot have more than one primary image");
  });
});
