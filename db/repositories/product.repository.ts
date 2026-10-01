import { ProductModel, ProductVariantModel, FashionCollectionModel } from "@/db/models";
import { IProduct, IProductVariant, PaginatedResult } from "@/types/database";
import { Gender, ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { FilterQuery, SortOrder } from "mongoose";

export interface ProductQueryFilters {
  gender?: Gender;
  brandId?: string;
  categoryId?: string;
  collectionId?: string;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  tags?: string[];
  productType?: string;
  search?: string;
  includeDeleted?: boolean;
  includeInactive?: boolean;
  saleOnly?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class ProductRepository {
  /**
   * Find product by unique slug
   */
  async findBySlug(
    slug: string,
    options: { includeInactive?: boolean } = {}
  ): Promise<IProduct | null> {
    const query: FilterQuery<IProduct> = {
      slug: slug.toLowerCase(),
      isDeleted: false,
    };

    if (!options.includeInactive) {
      query.status = ProductStatus.PUBLISHED;
      query.visibility = ProductVisibility.PUBLIC;
    }

    return ProductModel.findOne(query).lean<IProduct>();
  }

  /**
   * Find product by ID
   */
  async findById(
    id: string,
    options: { includeInactive?: boolean } = {}
  ): Promise<IProduct | null> {
    const query: FilterQuery<IProduct> = {
      _id: id,
      isDeleted: false,
    };

    if (!options.includeInactive) {
      query.status = ProductStatus.PUBLISHED;
      query.visibility = ProductVisibility.PUBLIC;
    }

    return ProductModel.findOne(query).lean<IProduct>();
  }

  /**
   * Paginated product query with filtering and sorting
   */
  async findPaginated(
    filters: ProductQueryFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<IProduct>> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IProduct> = {};

    if (!filters.includeDeleted) {
      query.isDeleted = false;
    }

    if (!filters.includeInactive) {
      query.status = filters.status || ProductStatus.PUBLISHED;
      query.visibility = filters.visibility || ProductVisibility.PUBLIC;
    } else if (filters.status) {
      query.status = filters.status;
    }

    if (filters.gender) {
      query.gender = filters.gender;
    }
    if (filters.brandId) {
      query.brandId = filters.brandId;
    }
    if (filters.categoryId) {
      query.categoryIds = filters.categoryId;
    }
    if (filters.collectionId) {
      query.$or = [
        { collectionIds: filters.collectionId },
        // Also support finding products listed in FashionCollection.productIds
      ];
    }
    if (filters.productType) {
      query.productType = filters.productType;
    }
    if (filters.featured !== undefined) {
      query.featured = filters.featured;
    }
    if (filters.bestseller !== undefined) {
      query.bestseller = filters.bestseller;
    }
    if (filters.newArrival !== undefined) {
      query.newArrival = filters.newArrival;
    }
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
    if (filters.search) {
      query.name = { $regex: filters.search, $options: "i" };
    }

    // If filtering by collection and collection has productIds
    if (filters.collectionId) {
      const collection = await FashionCollectionModel.findById(filters.collectionId).lean();
      if (collection && collection.productIds && collection.productIds.length > 0) {
        query.$or = [
          { _id: { $in: collection.productIds } },
          { collectionIds: filters.collectionId },
        ];
      }
    }

    const sortField = pagination.sortBy || "createdAt";
    const sortDirection: SortOrder = pagination.sortOrder === "asc" ? 1 : -1;

    const [items, total] = await Promise.all([
      ProductModel.find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean<IProduct[]>(),
      ProductModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Fetch all variants for a single product
   */
  async getVariantsByProductId(
    productId: string,
    options: { activeOnly?: boolean } = { activeOnly: true }
  ): Promise<IProductVariant[]> {
    const query: FilterQuery<IProductVariant> = { productId };
    if (options.activeOnly) {
      query.active = true;
      query.status = VariantStatus.ACTIVE;
    }
    return ProductVariantModel.find(query).lean<IProductVariant[]>();
  }

  /**
   * Batch fetch variants for multiple products to prevent N+1 queries
   */
  async getVariantsByProductIds(
    productIds: string[],
    options: { activeOnly?: boolean } = { activeOnly: true }
  ): Promise<Map<string, IProductVariant[]>> {
    const query: FilterQuery<IProductVariant> = { productId: { $in: productIds } };
    if (options.activeOnly) {
      query.active = true;
      query.status = VariantStatus.ACTIVE;
    }

    const variants = await ProductVariantModel.find(query).lean<IProductVariant[]>();
    const resultMap = new Map<string, IProductVariant[]>();

    for (const v of variants) {
      const pId = v.productId.toString();
      const existing = resultMap.get(pId) || [];
      existing.push(v);
      resultMap.set(pId, existing);
    }

    return resultMap;
  }

  /**
   * Find variant by SKU
   */
  async findVariantBySku(sku: string): Promise<IProductVariant | null> {
    return ProductVariantModel.findOne({ sku: sku.toUpperCase() }).lean<IProductVariant>();
  }

  /**
   * Find variant by ID
   */
  async findVariantById(id: string): Promise<IProductVariant | null> {
    return ProductVariantModel.findById(id).lean<IProductVariant>();
  }

  /**
   * Create a new product (Admin)
   */
  async createProduct(data: Partial<IProduct>): Promise<IProduct> {
    const product = new ProductModel(data);
    const saved = await product.save();
    return saved.toObject() as IProduct;
  }

  /**
   * Update an existing product (Admin)
   */
  async updateProduct(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    return ProductModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: data },
      { new: true }
    ).lean<IProduct>();
  }

  /**
   * Create a product variant (Admin)
   */
  async createVariant(data: Partial<IProductVariant>): Promise<IProductVariant> {
    const variant = new ProductVariantModel(data);
    const saved = await variant.save();
    return saved.toObject() as IProductVariant;
  }

  /**
   * Update a product variant (Admin)
   */
  async updateVariant(id: string, data: Partial<IProductVariant>): Promise<IProductVariant | null> {
    return ProductVariantModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    ).lean<IProductVariant>();
  }

  /**
   * Soft delete a product (Admin)
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await ProductModel.updateOne(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), status: ProductStatus.ARCHIVED } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Archive / soft delete a variant (Admin)
   */
  async softDeleteVariant(id: string): Promise<boolean> {
    const result = await ProductVariantModel.updateOne(
      { _id: id },
      { $set: { active: false, status: VariantStatus.DISCONTINUED } }
    );
    return result.modifiedCount > 0;
  }
}

export const productRepository = new ProductRepository();
