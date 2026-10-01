/**
 * VÉRONA — Phase 11 Product Details Integration Tests
 *
 * Tests for getProductBySlug visibility enforcement, draft rejection,
 * archived rejection, hierarchical breadcrumbs, and related products.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { productService } from "@/modules/catalog/product.service";
import { productRepository } from "@/db/repositories/product.repository";
import { CategoryModel, BrandModel, FashionCollectionModel } from "@/db/models";
import { ProductStatus, ProductVisibility, Gender } from "@/constants/status";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/repositories/product.repository", () => ({
  productRepository: {
    findBySlug: vi.fn(),
    findById: vi.fn(),
    getVariantsByProductId: vi.fn(),
    findPaginated: vi.fn(),
  },
}));

vi.mock("@/db/models", () => ({
  CategoryModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
  BrandModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
  FashionCollectionModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe("Product Details Integration (Phase 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("productService.getProductBySlug", () => {
    it("throws NotFoundError when product does not exist", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue(null);

      await expect(
        productService.getProductBySlug("non-existent-silhouette")
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects DRAFT products from public storefront access", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue({
        _id: "prod-draft" as any,
        name: "Unreleased Silk Robe",
        slug: "unreleased-silk-robe",
        status: ProductStatus.DRAFT, // Draft status!
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
        categoryIds: [],
        gender: Gender.WOMEN,
      } as any);

      await expect(
        productService.getProductBySlug("unreleased-silk-robe")
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects ARCHIVED / soft-deleted products from public storefront access", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue({
        _id: "prod-archived" as any,
        name: "Archived Linen Pant",
        slug: "archived-linen-pant",
        status: ProductStatus.ARCHIVED, // Archived status!
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
        categoryIds: [],
        gender: Gender.MEN,
      } as any);

      await expect(
        productService.getProductBySlug("archived-linen-pant")
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects soft-deleted products (isDeleted: true)", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue({
        _id: "prod-del" as any,
        name: "Deleted Cotton Top",
        slug: "deleted-cotton-top",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: true, // Soft-deleted!
        categoryIds: [],
        gender: Gender.WOMEN,
      } as any);

      await expect(
        productService.getProductBySlug("deleted-cotton-top")
      ).rejects.toThrow(NotFoundError);
    });

    it("resolves published public product with hierarchical breadcrumbs", async () => {
      const parentCat = {
        _id: "cat-clothing" as any,
        name: "Clothing",
        slug: "clothing",
        parentId: null,
      };

      const childCat = {
        _id: "cat-shirts" as any,
        name: "T-Shirts",
        slug: "t-shirts",
        parentId: "cat-clothing" as any,
      };

      vi.mocked(productRepository.findBySlug).mockResolvedValue({
        _id: "prod-tshirt" as any,
        name: "Classic Oversized Cotton T-Shirt",
        slug: "classic-oversized-cotton-t-shirt",
        description: "Artisanal oversized cotton t-shirt.",
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
        brandId: "brand-1" as any,
        categoryIds: ["cat-shirts" as any],
        collectionIds: [],
        gender: Gender.MEN,
        productType: "T-SHIRT",
        tags: ["cotton"],
        media: [],
        attributes: [],
      } as any);

      vi.mocked(BrandModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "brand-1",
          name: "VÉRONA ATELIER",
          slug: "verona-atelier",
        }),
      } as any);

      vi.mocked(CategoryModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([childCat]),
      } as any);

      vi.mocked(CategoryModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(parentCat),
      } as any);

      vi.mocked(FashionCollectionModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.mocked(productRepository.getVariantsByProductId).mockResolvedValue([]);
      vi.mocked(productRepository.findById).mockResolvedValue(null); // for related products

      const result = await productService.getProductBySlug("classic-oversized-cotton-t-shirt");

      expect(result.product.name).toBe("Classic Oversized Cotton T-Shirt");
      expect(result.product.brand?.name).toBe("VÉRONA ATELIER");

      // Verify breadcrumb trail: Home -> Men -> Clothing -> T-Shirts -> Classic Oversized Cotton T-Shirt
      expect(result.breadcrumbs).toEqual([
        { label: "Home", href: "/" },
        { label: "Men", href: "/men" },
        { label: "Clothing", href: "/shop?category=clothing" },
        { label: "T-Shirts", href: "/shop?category=t-shirts" },
        { label: "Classic Oversized Cotton T-Shirt" },
      ]);
    });
  });
});
