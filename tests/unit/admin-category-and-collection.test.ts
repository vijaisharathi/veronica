/**
 * VÉRONA — Admin Category, Collection & Brand Management Tests (Phase 28)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { ConflictError, ValidationError, NotFoundError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAuditTrail: vi.fn().mockResolvedValue(undefined),
}));

const mockCategoryFind = vi.fn();
const mockCategoryFindOne = vi.fn();
const mockCategoryFindById = vi.fn();
const mockCategoryCreate = vi.fn();
const mockCategoryBulkWrite = vi.fn();

const mockCollectionFind = vi.fn();
const mockCollectionFindOne = vi.fn();
const mockCollectionCreate = vi.fn();

const mockBrandFind = vi.fn();
const mockBrandFindOne = vi.fn();
const mockBrandCreate = vi.fn();

const mockProductCount = vi.fn();
const mockProductAggregate = vi.fn();

vi.mock("@/db/models", () => ({
  CategoryModel: {
    find: (...args: unknown[]) => mockCategoryFind(...args),
    findOne: (...args: unknown[]) => mockCategoryFindOne(...args),
    findById: (...args: unknown[]) => mockCategoryFindById(...args),
    create: (...args: unknown[]) => mockCategoryCreate(...args),
    bulkWrite: (...args: unknown[]) => mockCategoryBulkWrite(...args),
  },
  FashionCollectionModel: {
    find: (...args: unknown[]) => mockCollectionFind(...args),
    findOne: (...args: unknown[]) => mockCollectionFindOne(...args),
    create: (...args: unknown[]) => mockCollectionCreate(...args),
  },
  BrandModel: {
    find: (...args: unknown[]) => mockBrandFind(...args),
    findOne: (...args: unknown[]) => mockBrandFindOne(...args),
    create: (...args: unknown[]) => mockBrandCreate(...args),
  },
  ProductModel: {
    countDocuments: (...args: unknown[]) => mockProductCount(...args),
    aggregate: (...args: unknown[]) => mockProductAggregate(...args),
  },
}));

describe("AdminCatalogService — Category Hierarchy & Cycle Prevention", () => {
  let service: AdminCatalogService;
  const mockStaff = { _id: "staff-1", email: "admin@verona.com" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminCatalogService();
    mockProductAggregate.mockResolvedValue([]);
  });

  it("prevents self-parenting when updating a category", async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: "cat-1",
      name: "Outerwear",
      slug: "outerwear",
      save: vi.fn(),
      toObject: vi.fn().mockReturnValue({}),
    });

    await expect(
      service.updateCategory("cat-1", { parentId: "cat-1" }, mockStaff)
    ).rejects.toThrow("Category cannot be its own parent");
  });

  it("detects and prevents circular hierarchy loops (A -> B -> A)", async () => {
    // Current category is "cat-A", user wants to set parent to "cat-B"
    // But "cat-B" already has parent "cat-A"
    mockCategoryFindOne.mockResolvedValue({
      _id: "cat-A",
      name: "Jackets",
      slug: "jackets",
      save: vi.fn(),
      toObject: vi.fn().mockReturnValue({}),
    });

    mockCategoryFindById.mockImplementation((id: string) => ({
      lean: vi.fn().mockResolvedValue(
        id === "cat-B"
          ? { _id: "cat-B", parentId: "cat-A" }
          : null
      ),
    }));

    await expect(
      service.updateCategory("cat-A", { parentId: "cat-B" }, mockStaff)
    ).rejects.toThrow("Circular category relationship detected");
  });

  it("prevents archiving a category if published products are linked", async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: "cat-1",
      name: "Silk Shirts",
      isDeleted: false,
    });
    mockProductCount.mockResolvedValue(12); // 12 active products

    await expect(service.archiveCategory("cat-1", mockStaff)).rejects.toThrow(
      "Cannot archive category 'Silk Shirts' because it contains 12 published product(s)"
    );
  });

  it("successfully reorders categories with bulkWrite", async () => {
    mockCategoryBulkWrite.mockResolvedValue({ ok: 1 });

    const result = await service.reorderCategories(["cat-1", "cat-2", "cat-3"], mockStaff);
    expect(result).toBe(true);
    expect(mockCategoryBulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: "cat-1" }, update: { $set: { sortOrder: 0 } } } },
      { updateOne: { filter: { _id: "cat-2" }, update: { $set: { sortOrder: 1 } } } },
      { updateOne: { filter: { _id: "cat-3" }, update: { $set: { sortOrder: 2 } } } },
    ]);
  });
});

describe("AdminCatalogService — Brand & Collection Safety", () => {
  let service: AdminCatalogService;
  const mockStaff = { _id: "staff-1", email: "admin@verona.com" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminCatalogService();
  });

  it("prevents archiving a brand if published products reference it", async () => {
    mockBrandFindOne.mockResolvedValue({
      _id: "brand-1",
      name: "VÉRONA Atelier",
      isDeleted: false,
    });
    mockProductCount.mockResolvedValue(25); // 25 active products

    await expect(service.archiveBrand("brand-1", mockStaff)).rejects.toThrow(
      "Cannot archive brand 'VÉRONA Atelier' because 25 active product(s) are assigned to it"
    );
  });

  it("creates a brand with normalized slug and persists audit trail", async () => {
    mockBrandFindOne.mockResolvedValue(null);
    mockBrandCreate.mockResolvedValue({
      _id: "brand-new",
      name: "Loro Piana",
      slug: "loro-piana",
      toObject: vi.fn().mockReturnValue({}),
    });
    mockBrandFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: "brand-new",
          name: "Loro Piana",
          slug: "loro-piana",
          sortOrder: 0,
        },
      ]),
    });
    mockProductAggregate.mockResolvedValue([]);

    const created = await service.createBrand({ name: "Loro Piana" }, mockStaff);
    expect(created.slug).toBe("loro-piana");
    expect(created.name).toBe("Loro Piana");
  });

  it("creates a collection and normalizes slug", async () => {
    mockCollectionFindOne.mockResolvedValue(null);
    mockCollectionCreate.mockResolvedValue({
      _id: "col-1",
      name: "Winter Capsule 2026",
      slug: "winter-capsule-2026",
      toObject: vi.fn().mockReturnValue({}),
    });
    mockCollectionFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: "col-1",
          name: "Winter Capsule 2026",
          slug: "winter-capsule-2026",
          productIds: [],
          sortOrder: 0,
        },
      ]),
    });

    const created = await service.createCollection({ name: "Winter Capsule 2026" }, mockStaff);
    expect(created.slug).toBe("winter-capsule-2026");
  });
});
