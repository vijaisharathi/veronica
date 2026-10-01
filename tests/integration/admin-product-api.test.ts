/**
 * VÉRONA — Phase 09 Admin Product Management API Integration Tests
 *
 * Tests for RBAC-protected product and variant mutation endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createProduct } from "@/app/api/admin/products/route";
import {
  PATCH as updateProduct,
  DELETE as deleteProduct,
} from "@/app/api/admin/products/[id]/route";
import { POST as createVariant } from "@/app/api/admin/products/[id]/variants/route";
import * as rbacModule from "@/lib/auth/rbac";
import { productService } from "@/modules/catalog/product.service";
import {
  AuthenticationError,
  InsufficientPermissionError,
  NotFoundError,
} from "@/lib/errors";

vi.mock("@/modules/catalog/product.service", () => ({
  productService: {
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    archiveProduct: vi.fn(),
    createVariant: vi.fn(),
    updateVariant: vi.fn(),
    archiveVariant: vi.fn(),
  },
}));

vi.mock("@/modules/catalog/admin-catalog.service", () => ({
  adminCatalogService: {
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    archiveProduct: vi.fn(),
    getProductDetail: vi.fn(),
    listProducts: vi.fn(),
  },
}));

import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";

describe("Admin Product Management APIs (Phase 09)", () => {
  const mockStaff: any = {
    _id: "staff-1",
    email: "catalog.manager@verona.internal",
    firstName: "Priya",
    lastName: "Kapoor",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/admin/products", () => {
    it("returns 401 when request is unauthenticated", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockRejectedValue(
        new AuthenticationError("Authentication required")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "POST",
        body: JSON.stringify({ name: "Silk Shirt" }),
      });
      const res = await createProduct(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("returns 403 when staff lacks products.create permission", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockRejectedValue(
        new InsufficientPermissionError("products.create")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "POST",
        body: JSON.stringify({ name: "Silk Shirt" }),
      });
      const res = await createProduct(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it("returns 201 when staff has permission and provides valid product data", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      vi.mocked(productService.createProduct).mockResolvedValue({
        _id: "prod-new",
        name: "Handcrafted Silk Kurta",
        slug: "handcrafted-silk-kurta",
      } as any);
      vi.mocked(adminCatalogService.createProduct).mockResolvedValue({
        _id: "prod-new",
        name: "Handcrafted Silk Kurta",
        slug: "handcrafted-silk-kurta",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Handcrafted Silk Kurta",
          slug: "handcrafted-silk-kurta",
          description: "Luxury hand-spun silk kurta.",
          productType: "KURTA",
          gender: "MEN",
          categoryIds: ["507f1f77bcf86cd799439011"],
          status: "DRAFT",
          visibility: "PUBLIC",
        }),
      });
      const res = await createProduct(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.slug).toBe("handcrafted-silk-kurta");
    });
  });

  describe("PATCH /api/admin/products/[id]", () => {
    it("returns 403 when staff lacks products.update permission", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockRejectedValue(
        new InsufficientPermissionError("products.update")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/products/507f1f77bcf86cd799439011", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await updateProduct(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it("returns 200 when updating with products.update permission", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      vi.mocked(productService.updateProduct).mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Updated Kurta Name",
      } as any);
      vi.mocked(adminCatalogService.updateProduct).mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Updated Kurta Name",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/products/507f1f77bcf86cd799439011", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Kurta Name" }),
      });
      const res = await updateProduct(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("DELETE /api/admin/products/[id]", () => {
    it("returns 403 when staff lacks products.delete permission", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockRejectedValue(
        new InsufficientPermissionError("products.delete")
      );

      const req = new NextRequest("http://localhost:3000/api/admin/products/507f1f77bcf86cd799439011", {
        method: "DELETE",
      });
      const res = await deleteProduct(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
    });

    it("returns 200 when soft deleting with products.delete permission", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      vi.mocked(productService.archiveProduct).mockResolvedValue(undefined as any);
      vi.mocked(adminCatalogService.archiveProduct).mockResolvedValue(true as any);

      const req = new NextRequest("http://localhost:3000/api/admin/products/507f1f77bcf86cd799439011", {
        method: "DELETE",
      });
      const res = await deleteProduct(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("POST /api/admin/products/[id]/variants", () => {
    it("returns 201 when adding a variant with valid SKU and minor unit pricing", async () => {
      vi.spyOn(rbacModule, "requirePermission").mockResolvedValue(mockStaff);
      vi.mocked(productService.createVariant).mockResolvedValue({
        _id: "var-new",
        productId: "507f1f77bcf86cd799439011",
        sku: "VER-MEN-KUR-WHT-40",
      } as any);

      const req = new NextRequest(
        "http://localhost:3000/api/admin/products/507f1f77bcf86cd799439011/variants",
        {
          method: "POST",
          body: JSON.stringify({
            sku: "VER-MEN-KUR-WHT-40",
            size: "40",
            color: { name: "Ivory", slug: "ivory", hexCode: "#FFFFF0" },
            mrp: 6999,
            sellingPrice: 5999,
            status: "ACTIVE",
          }),
        }
      );
      const res = await createVariant(req, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
      });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.sku).toBe("VER-MEN-KUR-WHT-40");
    });
  });
});
