/**
 * VÉRONA — Admin Catalog Domain Service (Phase 28)
 *
 * Central administrative orchestration service for Product, Variant, Brand,
 * Category, and Collection management. Integrates with existing Phase 8, 9, 12,
 * and 15 services and enforces strict business invariants, cycle prevention,
 * and audit trail logging.
 */

import { connectToDatabase } from "@/db/client";
import {
  ProductModel,
  ProductVariantModel,
  CategoryModel,
  BrandModel,
  FashionCollectionModel,
} from "@/db/models";
import {
  Gender,
  ProductStatus,
  ProductVisibility,
  VariantStatus,
} from "@/constants/status";
import {
  IProduct,
  IProductVariant,
  ICategory,
  IBrand,
  IFashionCollection,
} from "@/types/database";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/lib/errors";
import { normalizeSlug } from "@/lib/slug";
import { formatMoney, minorToMajor, calculateDiscountPercent } from "@/lib/money";
import { logAuditTrail } from "@/lib/audit";
import { IStaff } from "@/types/database";
import {
  AdminProductListItemDTO,
  AdminProductDetailDTO,
  AdminVariantDTO,
  AdminCategoryListItemDTO,
  AdminCollectionListItemDTO,
  AdminBrandListItemDTO,
  BulkOperationResultDTO,
} from "./admin-catalog.types";
import {
  AdminProductListQueryParams,
  AdminCategoryCreateInput,
  AdminCategoryUpdateInput,
  AdminCollectionCreateInput,
  AdminCollectionUpdateInput,
  AdminBrandCreateInput,
  AdminBrandUpdateInput,
  AdminBulkProductActionInput,
} from "./admin-catalog.validation";
import { CreateProductInput, UpdateProductInput } from "./catalog.validation";

export class AdminCatalogService {
  // =========================================================================
  // 1. PRODUCT MANAGEMENT
  // =========================================================================

  /**
   * Lists products with admin-oriented filtering, search, pagination, and stock aggregations.
   */
  async listProducts(params: AdminProductListQueryParams): Promise<{
    products: AdminProductListItemDTO[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectToDatabase();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { isDeleted: false };

    if (params.status) {
      query.status = params.status;
    }
    if (params.visibility) {
      query.visibility = params.visibility;
    }
    if (params.gender) {
      query.gender = params.gender;
    }
    if (params.brandId) {
      query.brandId = params.brandId;
    }
    if (params.categoryId) {
      query.categoryIds = params.categoryId;
    }
    if (params.productType) {
      query.productType = params.productType;
    }
    if (params.search) {
      const escaped = params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {
      [params.sortBy || "createdAt"]: params.sortOrder === "asc" ? 1 : -1,
    };

    const [products, total] = await Promise.all([
      ProductModel.find(query).sort(sortOptions).skip(skip).limit(limit).lean<IProduct[]>(),
      ProductModel.countDocuments(query),
    ]);

    if (products.length === 0) {
      return { products: [], total, page, totalPages: 0 };
    }

    const productIds = products.map((p) => p._id.toString());
    const brandIds = Array.from(new Set(products.map((p) => p.brandId).filter(Boolean)));
    const categoryIds = Array.from(
      new Set(products.flatMap((p) => p.categoryIds || []).map((id) => id.toString()))
    );

    // Fetch variants, brands, and categories in parallel
    const [variants, brands, categories] = await Promise.all([
      ProductVariantModel.find({ productId: { $in: productIds } }).lean<IProductVariant[]>(),
      BrandModel.find({ _id: { $in: brandIds } }).lean<IBrand[]>(),
      CategoryModel.find({ _id: { $in: categoryIds } }).lean<ICategory[]>(),
    ]);

    const brandMap = new Map(brands.map((b) => [b._id.toString(), b.name]));
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    const variantsByProduct = new Map<string, IProductVariant[]>();
    for (const v of variants) {
      const list = variantsByProduct.get(v.productId) || [];
      list.push(v);
      variantsByProduct.set(v.productId, list);
    }

    const items: AdminProductListItemDTO[] = products.map((p) => {
      const prodId = p._id.toString();
      const pVariants = variantsByProduct.get(prodId) || [];
      const primaryImg = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || "";

      let minPrice = 0;
      let maxPrice = 0;
      if (pVariants.length > 0) {
        const prices = pVariants.map((v) => v.sellingPrice);
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }

      const totalStock = pVariants.reduce((sum, v) => {
        const stock = (v as unknown as { inventory?: { availableStock?: number } })?.inventory?.availableStock ?? 0;
        return sum + stock;
      }, 0);

      const priceFormatted =
        minPrice === maxPrice
          ? formatMoney(minPrice)
          : `${formatMoney(minPrice)} - ${formatMoney(maxPrice)}`;

      return {
        id: prodId,
        name: p.name,
        slug: p.slug,
        status: p.status,
        visibility: p.visibility || ProductVisibility.PUBLIC,
        brandId: p.brandId,
        brandName: brandMap.get(p.brandId) || "Unknown Brand",
        categoryIds: p.categoryIds?.map((c) => c.toString()) || [],
        categoryNames: (p.categoryIds || []).map((c) => categoryMap.get(c.toString()) || "Unknown"),
        gender: p.gender,
        productType: p.productType,
        primaryImage: primaryImg,
        variantCount: pVariants.length,
        totalStock,
        priceRange: {
          minSellingPriceMinor: minPrice,
          maxSellingPriceMinor: maxPrice,
          formatted: priceFormatted,
        },
        featured: !!p.featured,
        bestseller: !!p.bestseller,
        newArrival: !!p.newArrival,
        createdAt: (p as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: (p as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
      };
    });

    return {
      products: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves single product detail with populated relations and variants for administrative editing.
   */
  async getProductDetail(id: string): Promise<AdminProductDetailDTO> {
    await connectToDatabase();

    const product = await ProductModel.findOne({ _id: id, isDeleted: false }).lean<IProduct>();
    if (!product) {
      throw new NotFoundError("Product", id);
    }

    const [brand, categories, collections, variants] = await Promise.all([
      product.brandId ? BrandModel.findById(product.brandId).lean<IBrand>() : null,
      CategoryModel.find({ _id: { $in: product.categoryIds } }).lean<ICategory[]>(),
      product.collectionIds && product.collectionIds.length > 0
        ? FashionCollectionModel.find({ _id: { $in: product.collectionIds } }).lean<IFashionCollection[]>()
        : [],
      ProductVariantModel.find({ productId: id }).lean<IProductVariant[]>(),
    ]);

    const adminVariants: AdminVariantDTO[] = variants.map((v) => ({
      id: v._id.toString(),
      productId: v.productId,
      sku: v.sku,
      barcode: v.barcode,
      color: v.color,
      size: v.size,
      variantImages: v.variantImages || [],
      priceOverride: !!v.priceOverride,
      mrp: v.mrp,
      sellingPrice: v.sellingPrice,
      costPrice: v.costPrice,
      mrpFormatted: formatMoney(v.mrp),
      sellingPriceFormatted: formatMoney(v.sellingPrice),
      discountPercent: calculateDiscountPercent(v.mrp, v.sellingPrice),
      weightInGrams: v.weightInGrams,
      dimensions: v.dimensions,
      status: v.status,
      active: v.active,
      availableStock: (v as unknown as { inventory?: { availableStock?: number } })?.inventory?.availableStock ?? 0,
    }));

    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      brandId: product.brandId,
      brandName: brand?.name,
      categoryIds: product.categoryIds?.map((c) => c.toString()) || [],
      categoryNames: categories.map((c) => c.name),
      collectionIds: product.collectionIds?.map((c) => c.toString()) || [],
      collectionNames: collections.map((col) => col.name),
      gender: product.gender,
      productType: product.productType,
      fabric: product.fabric,
      fit: product.fit,
      pattern: product.pattern,
      occasion: product.occasion,
      season: product.season,
      tags: product.tags || [],
      images: product.images || [],
      careInstructions: product.careInstructions || [],
      specifications: product.specifications || [],
      seo: product.seo,
      status: product.status,
      visibility: product.visibility || ProductVisibility.PUBLIC,
      featured: !!product.featured,
      bestseller: !!product.bestseller,
      newArrival: !!product.newArrival,
      variants: adminVariants,
      createdAt: (product as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: (product as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Creates a product in DRAFT status by default, with complete input validation and audit logging.
   */
  async createProduct(input: CreateProductInput, staff: IStaff): Promise<AdminProductDetailDTO> {
    await connectToDatabase();

    const normalizedSlug = normalizeSlug(input.slug || input.name);

    // Slug conflict check
    const existing = await ProductModel.findOne({ slug: normalizedSlug, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Product with slug '${normalizedSlug}' already exists`);
    }

    // Verify brand if provided
    if (input.brandId) {
      const brand = await BrandModel.findOne({ _id: input.brandId, isDeleted: false });
      if (!brand) {
        throw new ValidationError(`Brand with ID '${input.brandId}' does not exist`);
      }
    }

    // Verify categories
    if (input.categoryIds && input.categoryIds.length > 0) {
      const catCount = await CategoryModel.countDocuments({
        _id: { $in: input.categoryIds },
        isDeleted: false,
      });
      if (catCount !== input.categoryIds.length) {
        throw new ValidationError("One or more specified categories do not exist");
      }
    }

    const created = await ProductModel.create({
      ...input,
      slug: normalizedSlug,
      status: input.status || ProductStatus.DRAFT,
      visibility: input.visibility || ProductVisibility.PUBLIC,
      isDeleted: false,
    });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: created._id.toString(),
      after: created.toObject(),
    });

    return this.getProductDetail(created._id.toString());
  }

  /**
   * Updates product fields with slug collision detection and audit logging.
   */
  async updateProduct(
    id: string,
    input: UpdateProductInput,
    staff: IStaff
  ): Promise<AdminProductDetailDTO> {
    await connectToDatabase();

    const existing = await ProductModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Product", id);
    }

    if (input.slug && input.slug !== existing.slug) {
      const normalizedSlug = normalizeSlug(input.slug);
      const conflict = await ProductModel.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
        isDeleted: false,
      });
      if (conflict) {
        throw new ConflictError(`Product with slug '${normalizedSlug}' already exists`);
      }
      input.slug = normalizedSlug;
    }

    const beforeState = existing.toObject();

    Object.assign(existing, input);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "PRODUCT_UPDATED",
      entityType: "PRODUCT",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    return this.getProductDetail(id);
  }

  /**
   * Publishes a product after verifying all business invariants:
   * 1. Must have category and brand
   * 2. Must have at least 1 image
   * 3. Must have at least 1 active variant with selling price > 0
   */
  async publishProduct(id: string, staff: IStaff): Promise<AdminProductDetailDTO> {
    await connectToDatabase();

    const product = await ProductModel.findOne({ _id: id, isDeleted: false });
    if (!product) {
      throw new NotFoundError("Product", id);
    }

    // 1. Classification check
    if (!product.categoryIds || product.categoryIds.length === 0) {
      throw new ValidationError("Cannot publish product without at least one category assigned");
    }
    if (!product.brandId) {
      throw new ValidationError("Cannot publish product without a brand assigned");
    }

    // 2. Media check
    if (!product.images || product.images.length === 0) {
      throw new ValidationError("Cannot publish product without at least one product image");
    }

    // 3. Variant & Pricing check
    const activeVariants = await ProductVariantModel.find({
      productId: id,
      active: true,
      status: VariantStatus.ACTIVE,
    });

    if (activeVariants.length === 0) {
      throw new ValidationError("Cannot publish product without at least one active variant");
    }

    const hasInvalidPrices = activeVariants.some((v) => !v.sellingPrice || v.sellingPrice <= 0);
    if (hasInvalidPrices) {
      throw new ValidationError("Cannot publish product with variants lacking valid selling prices");
    }

    const beforeStatus = product.status;
    product.status = ProductStatus.PUBLISHED;
    product.visibility = ProductVisibility.PUBLIC;
    await product.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "PRODUCT_PUBLISHED",
      entityType: "PRODUCT",
      entityId: id,
      before: { status: beforeStatus },
      after: { status: product.status, visibility: product.visibility },
    });

    return this.getProductDetail(id);
  }

  /**
   * Unpublishes a product by moving it back to DRAFT and hiding from discovery.
   */
  async unpublishProduct(id: string, staff: IStaff): Promise<AdminProductDetailDTO> {
    await connectToDatabase();

    const product = await ProductModel.findOne({ _id: id, isDeleted: false });
    if (!product) {
      throw new NotFoundError("Product", id);
    }

    const beforeStatus = product.status;
    product.status = ProductStatus.DRAFT;
    product.visibility = ProductVisibility.HIDDEN;
    await product.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "PRODUCT_UNPUBLISHED",
      entityType: "PRODUCT",
      entityId: id,
      before: { status: beforeStatus },
      after: { status: product.status, visibility: product.visibility },
    });

    return this.getProductDetail(id);
  }

  /**
   * Soft-deletes / archives a product and preserves all historical references.
   */
  async archiveProduct(id: string, staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const product = await ProductModel.findOne({ _id: id, isDeleted: false });
    if (!product) {
      throw new NotFoundError("Product", id);
    }

    product.isDeleted = true;
    product.status = ProductStatus.ARCHIVED;
    product.visibility = ProductVisibility.HIDDEN;
    await product.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "PRODUCT_ARCHIVED",
      entityType: "PRODUCT",
      entityId: id,
    });

    return true;
  }

  /**
   * Bulk updates product status with safe limits and per-item results.
   */
  async bulkUpdateProducts(
    input: AdminBulkProductActionInput,
    staff: IStaff
  ): Promise<BulkOperationResultDTO> {
    await connectToDatabase();

    const results: BulkOperationResultDTO["results"] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const prodId of input.productIds) {
      try {
        if (input.action === "PUBLISH") {
          await this.publishProduct(prodId, staff);
        } else if (input.action === "UNPUBLISH") {
          await this.unpublishProduct(prodId, staff);
        } else if (input.action === "ARCHIVE") {
          await this.archiveProduct(prodId, staff);
        } else if (input.action === "SET_STATUS" && input.status) {
          const product = await ProductModel.findOne({ _id: prodId, isDeleted: false });
          if (!product) throw new NotFoundError("Product", prodId);
          product.status = input.status;
          await product.save();
        }
        results.push({ id: prodId, success: true });
        successCount++;
      } catch (err) {
        results.push({
          id: prodId,
          success: false,
          error: err instanceof Error ? err.message : "Failed to execute bulk action",
        });
        failureCount++;
      }
    }

    return {
      totalProcessed: input.productIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  // =========================================================================
  // 2. CATEGORY MANAGEMENT & CYCLE PREVENTION
  // =========================================================================

  /**
   * Lists all categories with product counts and parent hierarchy labels.
   */
  async listCategories(): Promise<AdminCategoryListItemDTO[]> {
    await connectToDatabase();

    const categories = await CategoryModel.find({ isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .lean<ICategory[]>();

    const catMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    // Aggregate product counts per category
    const countAgg = await ProductModel.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$categoryIds" },
      { $group: { _id: "$categoryIds", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const item of countAgg) {
      countMap.set(item._id.toString(), item.count);
    }

    return categories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId ? c.parentId.toString() : null,
      parentName: c.parentId ? catMap.get(c.parentId.toString()) : undefined,
      image: c.image,
      banner: c.banner,
      gender: c.gender,
      sortOrder: c.sortOrder ?? 0,
      active: c.active,
      productCount: countMap.get(c._id.toString()) || 0,
      seo: c.seo,
    }));
  }

  /**
   * Creates a new category with slug normalization.
   */
  async createCategory(input: AdminCategoryCreateInput, staff: IStaff): Promise<AdminCategoryListItemDTO> {
    await connectToDatabase();

    const normalizedSlug = normalizeSlug(input.slug || input.name);
    const existing = await CategoryModel.findOne({ slug: normalizedSlug, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Category with slug '${normalizedSlug}' already exists`);
    }

    if (input.parentId) {
      const parent = await CategoryModel.findOne({ _id: input.parentId, isDeleted: false });
      if (!parent) {
        throw new ValidationError(`Parent category '${input.parentId}' not found`);
      }
    }

    const created = await CategoryModel.create({
      ...input,
      slug: normalizedSlug,
      isDeleted: false,
    });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CATEGORY_CREATED",
      entityType: "CATEGORY",
      entityId: created._id.toString(),
      after: created.toObject(),
    });

    const all = await this.listCategories();
    return all.find((c) => c.id === created._id.toString())!;
  }

  /**
   * Updates category with cycle and self-parenting prevention.
   */
  async updateCategory(
    id: string,
    input: AdminCategoryUpdateInput,
    staff: IStaff
  ): Promise<AdminCategoryListItemDTO> {
    await connectToDatabase();

    const existing = await CategoryModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Category", id);
    }

    // 1. Slug uniqueness
    if (input.slug && input.slug !== existing.slug) {
      const normalizedSlug = normalizeSlug(input.slug);
      const conflict = await CategoryModel.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
        isDeleted: false,
      });
      if (conflict) {
        throw new ConflictError(`Category with slug '${normalizedSlug}' already exists`);
      }
      input.slug = normalizedSlug;
    }

    // 2. Cycle prevention
    if (input.parentId !== undefined && input.parentId !== null) {
      if (input.parentId === id) {
        throw new ConflictError("Category cannot be its own parent");
      }

      // Traverse up parent chain to detect loops
      let currentParentId: string | null | undefined = input.parentId;
      const visited = new Set<string>([id]);

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          throw new ConflictError("Circular category relationship detected: parent is a descendant");
        }
        visited.add(currentParentId);

        const parentDoc: ICategory | null = await CategoryModel.findById(currentParentId).lean<ICategory>();
        if (!parentDoc) {
          throw new ValidationError(`Parent category '${currentParentId}' does not exist`);
        }
        currentParentId = parentDoc.parentId ? parentDoc.parentId.toString() : null;
      }
    }

    const beforeState = existing.toObject();
    Object.assign(existing, input);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CATEGORY_UPDATED",
      entityType: "CATEGORY",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    const all = await this.listCategories();
    return all.find((c) => c.id === id)!;
  }

  /**
   * Archives a category after checking that no active products are linked to it.
   */
  async archiveCategory(id: string, staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const existing = await CategoryModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Category", id);
    }

    // Check if active products reference this category
    const productCount = await ProductModel.countDocuments({
      categoryIds: id,
      isDeleted: false,
      status: ProductStatus.PUBLISHED,
    });

    if (productCount > 0) {
      throw new ConflictError(
        `Cannot archive category '${existing.name}' because it contains ${productCount} published product(s)`
      );
    }

    existing.isDeleted = true;
    existing.active = false;
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CATEGORY_ARCHIVED",
      entityType: "CATEGORY",
      entityId: id,
    });

    return true;
  }

  /**
   * Reorders categories sequentially based on provided array of IDs.
   */
  async reorderCategories(orderedIds: string[], staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await CategoryModel.bulkWrite(bulkOps);
    }

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CATEGORIES_REORDERED",
      entityType: "CATEGORY",
      entityId: "BULK",
      metadata: { orderedIds },
    });

    return true;
  }

  // =========================================================================
  // 3. COLLECTION MANAGEMENT
  // =========================================================================

  /**
   * Lists fashion collections with member product counts.
   */
  async listCollections(): Promise<AdminCollectionListItemDTO[]> {
    await connectToDatabase();

    const collections = await FashionCollectionModel.find({ isDeleted: false })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean<IFashionCollection[]>();

    return collections.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      heroImage: c.heroImage,
      banner: c.banner,
      productIds: (c.productIds || []).map((id) => id.toString()),
      categoryIds: (c.categoryIds || []).map((id) => id.toString()),
      active: c.active,
      startDate: c.startDate ? new Date(c.startDate).toISOString() : null,
      endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
      sortOrder: c.sortOrder ?? 0,
      productCount: c.productIds?.length || 0,
      seo: c.seo,
    }));
  }

  /**
   * Creates a new fashion collection.
   */
  async createCollection(
    input: AdminCollectionCreateInput,
    staff: IStaff
  ): Promise<AdminCollectionListItemDTO> {
    await connectToDatabase();

    const normalizedSlug = normalizeSlug(input.slug || input.name);
    const existing = await FashionCollectionModel.findOne({ slug: normalizedSlug, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Collection with slug '${normalizedSlug}' already exists`);
    }

    const created = await FashionCollectionModel.create({
      ...input,
      slug: normalizedSlug,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      isDeleted: false,
    });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "COLLECTION_CREATED",
      entityType: "COLLECTION",
      entityId: created._id.toString(),
      after: created.toObject(),
    });

    const all = await this.listCollections();
    return all.find((c) => c.id === created._id.toString())!;
  }

  /**
   * Updates a fashion collection and its product membership.
   */
  async updateCollection(
    id: string,
    input: AdminCollectionUpdateInput,
    staff: IStaff
  ): Promise<AdminCollectionListItemDTO> {
    await connectToDatabase();

    const existing = await FashionCollectionModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Collection", id);
    }

    if (input.slug && input.slug !== existing.slug) {
      const normalizedSlug = normalizeSlug(input.slug);
      const conflict = await FashionCollectionModel.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
        isDeleted: false,
      });
      if (conflict) {
        throw new ConflictError(`Collection with slug '${normalizedSlug}' already exists`);
      }
      input.slug = normalizedSlug;
    }

    const beforeState = existing.toObject();

    const updatePayload: Record<string, unknown> = { ...input };
    if (input.startDate !== undefined) {
      updatePayload.startDate = input.startDate ? new Date(input.startDate) : null;
    }
    if (input.endDate !== undefined) {
      updatePayload.endDate = input.endDate ? new Date(input.endDate) : null;
    }

    Object.assign(existing, updatePayload);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "COLLECTION_UPDATED",
      entityType: "COLLECTION",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    const all = await this.listCollections();
    return all.find((c) => c.id === id)!;
  }

  /**
   * Archives a collection.
   */
  async archiveCollection(id: string, staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const existing = await FashionCollectionModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Collection", id);
    }

    existing.isDeleted = true;
    existing.active = false;
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "COLLECTION_ARCHIVED",
      entityType: "COLLECTION",
      entityId: id,
    });

    return true;
  }

  // =========================================================================
  // 4. BRAND MANAGEMENT
  // =========================================================================

  /**
   * Lists brands with product count metrics.
   */
  async listBrands(): Promise<AdminBrandListItemDTO[]> {
    await connectToDatabase();

    const brands = await BrandModel.find({ isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .lean<IBrand[]>();

    const brandCounts = await ProductModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const b of brandCounts) {
      countMap.set(b._id.toString(), b.count);
    }

    return brands.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      slug: b.slug,
      description: b.description,
      logo: b.logo,
      banner: b.banner,
      website: b.website,
      active: b.active,
      sortOrder: b.sortOrder ?? 0,
      productCount: countMap.get(b._id.toString()) || 0,
      seo: b.seo,
    }));
  }

  /**
   * Creates a brand with slug normalization.
   */
  async createBrand(input: AdminBrandCreateInput, staff: IStaff): Promise<AdminBrandListItemDTO> {
    await connectToDatabase();

    const normalizedSlug = normalizeSlug(input.slug || input.name);
    const existing = await BrandModel.findOne({ slug: normalizedSlug, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Brand with slug '${normalizedSlug}' already exists`);
    }

    const created = await BrandModel.create({
      ...input,
      slug: normalizedSlug,
      isDeleted: false,
    });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "BRAND_CREATED",
      entityType: "BRAND",
      entityId: created._id.toString(),
      after: created.toObject(),
    });

    const all = await this.listBrands();
    return all.find((b) => b.id === created._id.toString())!;
  }

  /**
   * Updates a brand with conflict checks.
   */
  async updateBrand(
    id: string,
    input: AdminBrandUpdateInput,
    staff: IStaff
  ): Promise<AdminBrandListItemDTO> {
    await connectToDatabase();

    const existing = await BrandModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Brand", id);
    }

    if (input.slug && input.slug !== existing.slug) {
      const normalizedSlug = normalizeSlug(input.slug);
      const conflict = await BrandModel.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
        isDeleted: false,
      });
      if (conflict) {
        throw new ConflictError(`Brand with slug '${normalizedSlug}' already exists`);
      }
      input.slug = normalizedSlug;
    }

    const beforeState = existing.toObject();
    Object.assign(existing, input);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "BRAND_UPDATED",
      entityType: "BRAND",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    const all = await this.listBrands();
    return all.find((b) => b.id === id)!;
  }

  /**
   * Archives a brand after checking that no active products are linked to it.
   */
  async archiveBrand(id: string, staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const existing = await BrandModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Brand", id);
    }

    const linkedCount = await ProductModel.countDocuments({
      brandId: id,
      isDeleted: false,
      status: ProductStatus.PUBLISHED,
    });

    if (linkedCount > 0) {
      throw new ConflictError(
        `Cannot archive brand '${existing.name}' because ${linkedCount} active product(s) are assigned to it`
      );
    }

    existing.isDeleted = true;
    existing.active = false;
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "BRAND_ARCHIVED",
      entityType: "BRAND",
      entityId: id,
    });

    return true;
  }
}

export const adminCatalogService = new AdminCatalogService();
