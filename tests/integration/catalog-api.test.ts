/**
 * VÉRONA — Phase 09 Catalog API Integration Tests
 *
 * Tests for public product catalog endpoints, category/collection product association, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProducts } from "@/app/api/products/route";
import { GET as getProductBySlug } from "@/app/api/products/[slug]/route";
import { GET as getCategoryProducts } from "@/app/api/categories/[slug]/products/route";
import { GET as getCollectionProducts } from "@/app/api/collections/[slug]/products/route";
import { productService } from "@/modules/catalog/product.service";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/modules/catalog/product.service", () => ({
  productService: {
    getProducts: vi.fn(),
    getProductBySlug: vi.fn(),
    getProductsByCategory: vi.fn(),
    getProductsByCollection: vi.fn(),
  },
}));

describe("Catalog Public APIs Integration (Phase 09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/products", () => {
    it("returns 200 with paginated product previews", async () => {
      vi.mocked(productService.getProducts).mockResolvedValue({
        items: [
          {
            id: "prod-1",
            slug: "handwoven-cotton-shirt",
            brand: "VÉRONA",
            title: "Handwoven Cotton Shirt",
            currentPrice: 4999,
            mrp: 5999,
            discountPercent: 17,
            rating: 0,
            ratingCount: 0,
            primaryImage: "/images/shirt.jpg",
            category: "Shirts",
            gender: "men",
            sizes: ["M", "L"],
            colors: [{ name: "White", hex: "#FFF" }],
            isNew: true,
            isSale: true,
            inStock: true,
          },
        ],
        dtos: [
          {
            id: "prod-1",
            name: "Handwoven Cotton Shirt",
            slug: "handwoven-cotton-shirt",
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
        hasMore: false,
      });

      const req = new NextRequest("http://localhost:3000/api/products?page=1&limit=12");
      const res = await getProducts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
      expect(json.data.pagination.total).toBe(1);
    });

    it("returns 400 when invalid query parameters are provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/products?page=invalid&limit=-5");
      const res = await getProducts(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/products/[slug]", () => {
    it("returns 200 with customer-safe product DTO and related products", async () => {
      vi.mocked(productService.getProductBySlug).mockResolvedValue({
        product: {
          id: "prod-1",
          name: "Handwoven Cotton Shirt",
          slug: "handwoven-cotton-shirt",
          description: "Artisanal shirt.",
          brand: { id: "b1", name: "VÉRONA", slug: "verona" },
          categories: [{ id: "c1", name: "Men", slug: "men", gender: "MEN" }],
          collections: [],
          media: [{ url: "/images/shirt.jpg", isPrimary: true, sortOrder: 0 }],
          variants: [],
          attributes: [],
          fabric: "100% Khadi",
          fit: "Relaxed",
          careInstructions: [],
          pricing: {
            currentPrice: 4999,
            mrp: 5999,
            currentPriceMinor: 499900,
            mrpMinor: 599900,
            discountPercent: 17,
            hasDiscount: true,
            isPriceRange: false,
            minPrice: 4999,
            maxPrice: 4999,
          },
          availability: { inStock: true, status: "AVAILABLE" },
          gender: "MEN",
          productType: "SHIRT",
          tags: ["cotton"],
          featured: false,
          bestseller: false,
          newArrival: true,
          status: "PUBLISHED" as any,
          visibility: "PUBLIC" as any,
          createdAt: new Date().toISOString(),
        },
        preview: {
          id: "prod-1",
          slug: "handwoven-cotton-shirt",
          brand: "VÉRONA",
          title: "Handwoven Cotton Shirt",
          currentPrice: 4999,
          mrp: 5999,
          discountPercent: 17,
          rating: 0,
          ratingCount: 0,
          primaryImage: "/images/shirt.jpg",
          category: "Men",
          gender: "men",
          sizes: [],
          colors: [],
          isNew: true,
          isSale: true,
          inStock: true,
        },
        relatedProducts: [],
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Handwoven Cotton Shirt" }],
      });

      const req = new NextRequest("http://localhost:3000/api/products/handwoven-cotton-shirt");
      const res = await getProductBySlug(req, {
        params: Promise.resolve({ slug: "handwoven-cotton-shirt" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.product.name).toBe("Handwoven Cotton Shirt");
      expect(json.data.product.slug).toBe("handwoven-cotton-shirt");
    });

    it("returns 404 when product is not found or inactive", async () => {
      vi.mocked(productService.getProductBySlug).mockRejectedValue(
        new NotFoundError("Product", "non-existent")
      );

      const req = new NextRequest("http://localhost:3000/api/products/non-existent");
      const res = await getProductBySlug(req, {
        params: Promise.resolve({ slug: "non-existent" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("RESOURCE_NOT_FOUND");
    });
  });

  describe("GET /api/categories/[slug]/products", () => {
    it("returns 200 with category products", async () => {
      vi.mocked(productService.getProductsByCategory).mockResolvedValue({
        category: {
          _id: "c1" as any,
          name: "Men",
          slug: "men",
          active: true,
        } as any,
        products: {
          items: [],
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
          hasMore: false,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/categories/men/products");
      const res = await getCategoryProducts(req, {
        params: Promise.resolve({ slug: "men" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.category.name).toBe("Men");
    });

    it("returns 404 when category does not exist", async () => {
      vi.mocked(productService.getProductsByCategory).mockRejectedValue(
        new NotFoundError("Category", "non-existent")
      );

      const req = new NextRequest("http://localhost:3000/api/categories/non-existent/products");
      const res = await getCategoryProducts(req, {
        params: Promise.resolve({ slug: "non-existent" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  describe("GET /api/collections/[slug]/products", () => {
    it("returns 200 with collection products", async () => {
      vi.mocked(productService.getProductsByCollection).mockResolvedValue({
        collection: {
          _id: "col-1" as any,
          name: "The Silk Route",
          slug: "the-silk-route",
          active: true,
        } as any,
        products: {
          items: [],
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
          hasMore: false,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/collections/the-silk-route/products");
      const res = await getCollectionProducts(req, {
        params: Promise.resolve({ slug: "the-silk-route" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.collection.name).toBe("The Silk Route");
    });

    it("returns 404 when collection does not exist", async () => {
      vi.mocked(productService.getProductsByCollection).mockRejectedValue(
        new NotFoundError("Collection", "non-existent")
      );

      const req = new NextRequest("http://localhost:3000/api/collections/non-existent/products");
      const res = await getCollectionProducts(req, {
        params: Promise.resolve({ slug: "non-existent" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });
});
