/**
 * VÉRONA — Phase 12 Garment Variant & Size System Integration Tests
 *
 * Verifies end-to-end API and service behaviors:
 * - Public GET /api/products/[slug]/variants (matrix, dimensions, variant DTOs)
 * - Public GET /api/products/[slug]/variants/resolve (exact match vs invalid combination)
 * - Admin POST /api/admin/products/[id]/variants (RBAC, duplicate combination & SKU prevention, auto-SKU)
 * - Admin GET /api/admin/products/[id]/variants (lists all variants including inactive)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getVariantsRoute } from "@/app/api/products/[slug]/variants/route";
import { GET as resolveVariantRoute } from "@/app/api/products/[slug]/variants/resolve/route";
import {
  POST as createVariantRoute,
  GET as getAdminVariantsRoute,
} from "@/app/api/admin/products/[id]/variants/route";
import { productService } from "@/modules/catalog/product.service";
import { productRepository } from "@/db/repositories/product.repository";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { ProductStatus, ProductVisibility, VariantStatus, Gender } from "@/constants/status";
import { ConflictError, NotFoundError, AuthorizationError, AuthenticationError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN" }),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/db/repositories/product.repository", () => ({
  productRepository: {
    findBySlug: vi.fn(),
    findById: vi.fn(),
    findVariantById: vi.fn(),
    findVariantBySku: vi.fn(),
    getVariantsByProductId: vi.fn(),
    createVariant: vi.fn(),
    updateVariant: vi.fn(),
    softDeleteVariant: vi.fn(),
  },
}));

vi.mock("@/db/models", () => ({
  CategoryModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  },
  BrandModel: {
    findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  },
  FashionCollectionModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
}));

describe("Garment Variant & Size System — Integration Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct = {
    _id: "prod-tee-1",
    name: "Classic Heavyweight Cotton T-Shirt",
    slug: "classic-heavyweight-cotton-t-shirt",
    description: "280 GSM long-staple Supima cotton t-shirt.",
    status: ProductStatus.PUBLISHED,
    visibility: ProductVisibility.PUBLIC,
    isDeleted: false,
    gender: Gender.MEN,
    productType: "T-Shirt",
    categoryIds: [],
    collectionIds: [],
    tags: ["cotton", "t-shirt"],
    images: [{ url: "/img/prod.jpg", isPrimary: true, sortOrder: 0 }],
    specifications: [],
    careInstructions: [],
  };

  const mockVariants = [
    {
      _id: "var-blk-s",
      productId: "prod-tee-1",
      sku: "VER-TEE-BLK-S",
      color: { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111" },
      size: "S",
      variantImages: ["/img/black.jpg"],
      priceOverride: false,
      mrp: 299900,
      sellingPrice: 219900,
      status: VariantStatus.ACTIVE,
      active: true,
    },
    {
      _id: "var-blk-m",
      productId: "prod-tee-1",
      sku: "VER-TEE-BLK-M",
      color: { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111" },
      size: "M",
      variantImages: ["/img/black.jpg"],
      priceOverride: false,
      mrp: 299900,
      sellingPrice: 219900,
      status: VariantStatus.ACTIVE,
      active: true,
    },
    {
      _id: "var-wht-m",
      productId: "prod-tee-1",
      sku: "VER-TEE-WHT-M",
      color: { name: "Ivory Pearl", slug: "ivory-pearl", hexCode: "#F9F6F0" },
      size: "M",
      variantImages: ["/img/white.jpg"],
      priceOverride: false,
      mrp: 299900,
      sellingPrice: 219900,
      status: VariantStatus.ACTIVE,
      active: true,
    },
  ];

  // -----------------------------------------------------------
  // 1. GET /api/products/[slug]/variants
  // -----------------------------------------------------------
  describe("GET /api/products/[slug]/variants", () => {
    it("should return matrix, dimensions, and customer-safe variants", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue(mockProduct as any);
      vi.mocked(productRepository.getVariantsByProductId).mockResolvedValue(mockVariants as any);

      const request = new NextRequest("http://localhost:3000/api/products/classic-heavyweight-cotton-t-shirt/variants");
      const response = await getVariantsRoute(request, {
        params: Promise.resolve({ slug: "classic-heavyweight-cotton-t-shirt" }),
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.productSlug).toBe("classic-heavyweight-cotton-t-shirt");
      expect(body.data.variants.length).toBe(3);
      expect(body.data.matrix.colors.length).toBe(2);
      expect(body.data.matrix.sizes.map((s: any) => s.code)).toEqual(["S", "M"]);
      expect(body.data.dimensions.dimensionType).toBe("COLOR_AND_SIZE");
    });

    it("should return 404 for unknown product slug", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/products/unknown-product/variants");
      const response = await getVariantsRoute(request, {
        params: Promise.resolve({ slug: "unknown-product" }),
      });

      const body = await response.json();
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // 2. GET /api/products/[slug]/variants/resolve
  // -----------------------------------------------------------
  describe("GET /api/products/[slug]/variants/resolve", () => {
    it("should resolve valid combination (Obsidian Black + S)", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue(mockProduct as any);
      vi.mocked(productRepository.getVariantsByProductId).mockResolvedValue(mockVariants as any);

      const request = new NextRequest(
        "http://localhost:3000/api/products/classic-heavyweight-cotton-t-shirt/variants/resolve?color=obsidian-black&size=S"
      );
      const response = await resolveVariantRoute(request, {
        params: Promise.resolve({ slug: "classic-heavyweight-cotton-t-shirt" }),
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("RESOLVED");
      expect(body.data.isAvailable).toBe(true);
      expect(body.data.sku).toBe("VER-TEE-BLK-S");
      expect(body.data.resolvedVariant.id).toBe("var-blk-s");
    });

    it("STRICT: should identify invalid combination (Ivory Pearl + S) without arbitrary fallback", async () => {
      vi.mocked(productRepository.findBySlug).mockResolvedValue(mockProduct as any);
      vi.mocked(productRepository.getVariantsByProductId).mockResolvedValue(mockVariants as any);

      const request = new NextRequest(
        "http://localhost:3000/api/products/classic-heavyweight-cotton-t-shirt/variants/resolve?color=ivory-pearl&size=S"
      );
      const response = await resolveVariantRoute(request, {
        params: Promise.resolve({ slug: "classic-heavyweight-cotton-t-shirt" }),
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("INVALID_COMBINATION");
      expect(body.data.resolvedVariant).toBeNull();
      expect(body.data.isAvailable).toBe(false);
      expect(body.data.message).toContain("unavailable");
    });

    it("should reject missing query parameters with 400 Bad Request", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/products/classic-heavyweight-cotton-t-shirt/variants/resolve?color=black"
      ); // Missing size!
      const response = await resolveVariantRoute(request, {
        params: Promise.resolve({ slug: "classic-heavyweight-cotton-t-shirt" }),
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // 3. Admin Variant Management & Protection
  // -----------------------------------------------------------
  describe("Admin Variant Management", () => {
    it("should reject variant creation when staff lacks PRODUCTS_CREATE permission", async () => {
      vi.mocked(requirePermission).mockRejectedValueOnce(
        new AuthorizationError("Staff lacks PRODUCTS_CREATE permission")
      );


      const request = new NextRequest("http://localhost:3000/api/admin/products/prod-tee-1/variants", {
        method: "POST",
        body: JSON.stringify({
          color: { name: "Sage Green", slug: "sage-green", hexCode: "#8A9A86" },
          size: "M",
          mrp: 299900,
          sellingPrice: 219900,
        }),
      });

      const response = await createVariantRoute(request, {
        params: Promise.resolve({ id: "prod-tee-1" }),
      });

      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
    });

    it("should create variant and deterministically generate SKU when omitted", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(productRepository.findVariantBySku).mockResolvedValue(null);
      vi.mocked(productRepository.getVariantsByProductId).mockResolvedValue(mockVariants as any);
      vi.mocked(productRepository.createVariant).mockImplementation(async (data: any) => ({
        _id: "var-new",
        ...data,
      }));

      const request = new NextRequest("http://localhost:3000/api/admin/products/prod-tee-1/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: { name: "Sage Green", slug: "sage-green", hexCode: "#8A9A86" },
          size: "L",
          mrp: 299900,
          sellingPrice: 219900,
        }),
      });

      const response = await createVariantRoute(request, {
        params: Promise.resolve({ id: "prod-tee-1" }),
      });

      const body = await response.json();
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.sku).toBeDefined();
      expect(body.data.sku).toContain("VER-");
      expect(body.data.color.name).toBe("Sage Green");
      expect(body.data.size).toBe("L");
    });

    it("should reject duplicate combination with 409 Conflict", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(productRepository.findVariantBySku).mockResolvedValue(null);
      // Obsidian Black + S already exists in mockVariants!
      vi.mocked(productRepository.getVariantsByProductId).mockResolvedValue(mockVariants as any);

      const request = new NextRequest("http://localhost:3000/api/admin/products/prod-tee-1/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111" },
          size: "S",
          mrp: 299900,
          sellingPrice: 219900,
        }),
      });

      const response = await createVariantRoute(request, {
        params: Promise.resolve({ id: "prod-tee-1" }),
      });

      const body = await response.json();
      expect(response.status).toBe(409);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("already exists for this product");
    });

    it("should retrieve all admin variants with GET /api/admin/products/[id]/variants", async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(productRepository.getVariantsByProductId).mockResolvedValue(mockVariants as any);

      const request = new NextRequest("http://localhost:3000/api/admin/products/prod-tee-1/variants");
      const response = await getAdminVariantsRoute(request, {
        params: Promise.resolve({ id: "prod-tee-1" }),
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.variants.length).toBe(3);
      expect(body.data.matrix).toBeDefined();
    });
  });
});
