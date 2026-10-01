/**
 * VÉRONA — Product Domain Service
 *
 * Core catalog business logic sitting between repositories/MongoDB and UI/API endpoints.
 * Handles customer-safe DTO transformations, relationship aggregation without N+1 queries,
 * deterministic pricing resolution, and storefront visibility enforcement.
 */

import { productRepository } from "@/db/repositories/product.repository";
import { categoryRepository } from "@/db/repositories/category.repository";
import { BrandModel, CategoryModel, FashionCollectionModel, ProductModel } from "@/db/models";
import { connectToDatabase } from "@/db/client";
import { ProductStatus, ProductVisibility, VariantStatus, Gender } from "@/constants/status";
import { IProduct, IProductVariant, IBrand, ICategory, IFashionCollection, PaginatedResult } from "@/types/database";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { minorToMajor, calculateDiscountPercent } from "@/lib/money";
import { normalizeSlug } from "@/lib/slug";
import {
  ProductDTO,
  ProductVariantDTO,
  ProductBrandDTO,
  ProductCategoryDTO,
  ProductCollectionDTO,
  ProductPricingDTO,
  ProductAvailabilityDTO,
  toProductPreview,
} from "./product.dto";
import { validateData } from "@/lib/validation";
import {
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
  ProductListParams,
  CreateProductInputSchema,
  CreateVariantInputSchema,
} from "./catalog.validation";
import { ProductPreview } from "@/types/storefront";
import { variantService } from "./variant.service";

import {
  VariantMatrix,
  VariantDimensionsScheme,
  ResolvedVariantResult,
} from "./variant.types";

export interface ProductDetailResult {
  product: ProductDTO;
  preview: ProductPreview;
  relatedProducts: ProductPreview[];
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export class ProductService {
  /**
   * Helper to map raw product and variant documents to ProductDTO
   */
  public toProductDTO(
    product: IProduct,
    variants: IProductVariant[],
    brand: IBrand | null,
    categories: ICategory[],
    collections: IFashionCollection[] = []
  ): ProductDTO {
    const brandDTO: ProductBrandDTO | null = brand
      ? {
          id: brand._id.toString(),
          name: brand.name,
          slug: brand.slug,
          logo: brand.logo,
          description: brand.description,
        }
      : null;

    const categoryDTOs: ProductCategoryDTO[] = categories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      gender: c.gender,
    }));

    const collectionDTOs: ProductCollectionDTO[] = collections.map((col) => ({
      id: col._id.toString(),
      name: col.name,
      slug: col.slug,
    }));

    const variantDTOs: ProductVariantDTO[] = variants.map((v) => {
      const mrpMajor = minorToMajor(v.mrp);
      const sellingMajor = minorToMajor(v.sellingPrice);
      const discount = calculateDiscountPercent(v.mrp, v.sellingPrice);
      const isAvailable = v.active && v.status === VariantStatus.ACTIVE;

      return {
        id: v._id.toString(),
        productId: product._id.toString(),
        sku: v.sku,
        color: v.color,
        size: v.size,
        variantImages: v.variantImages || [],
        mrp: mrpMajor,
        sellingPrice: sellingMajor,
        mrpMinor: v.mrp,
        sellingPriceMinor: v.sellingPrice,
        discountPercent: discount,
        status: v.status,
        active: v.active,
        available: isAvailable,
      };
    });

    // Pricing calculation across active variants
    const activeVariants = variants.filter((v) => v.active && v.status === VariantStatus.ACTIVE);
    const candidateVariants = activeVariants.length > 0 ? activeVariants : variants;

    let minPriceMinor = 0;
    let maxPriceMinor = 0;
    let baseMrpMinor = 0;
    let baseSellingMinor = 0;

    if (candidateVariants.length > 0) {
      const prices = candidateVariants.map((v) => v.sellingPrice);
      minPriceMinor = Math.min(...prices);
      maxPriceMinor = Math.max(...prices);
      const primaryVariant = candidateVariants[0]!;
      baseMrpMinor = primaryVariant.mrp;
      baseSellingMinor = primaryVariant.sellingPrice;
    }

    const currentPriceMajor = minorToMajor(baseSellingMinor);
    const mrpMajor = minorToMajor(baseMrpMinor);
    const discountPercent = calculateDiscountPercent(baseMrpMinor, baseSellingMinor);
    const hasDiscount = baseMrpMinor > baseSellingMinor && discountPercent > 0;

    const pricing: ProductPricingDTO = {
      currentPrice: currentPriceMajor,
      mrp: mrpMajor,
      currentPriceMinor: baseSellingMinor,
      mrpMinor: baseMrpMinor,
      discountPercent,
      hasDiscount,
      isPriceRange: minPriceMinor !== maxPriceMinor,
      minPrice: minorToMajor(minPriceMinor),
      maxPrice: minorToMajor(maxPriceMinor),
    };

    // Catalog availability
    const inStock = activeVariants.length > 0;
    const availability: ProductAvailabilityDTO = {
      inStock,
      status: inStock ? "AVAILABLE" : "OUT_OF_STOCK",
    };

    // Structured attributes
    const attributes = (product.specifications || []).map((spec) => ({
      label: spec.key,
      value: spec.value,
    }));

    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      brand: brandDTO,
      categories: categoryDTOs,
      collections: collectionDTOs,
      media: (product.images || []).map((img, idx) => ({
        url: img.url,
        alt: img.alt || `${product.name} - view ${idx + 1}`,
        isPrimary: img.isPrimary || idx === 0,
        sortOrder: img.sortOrder || idx + 1,
      })),
      variants: variantDTOs,
      attributes,
      fabric: product.fabric,
      fit: product.fit,
      pattern: product.pattern,
      occasion: product.occasion,
      season: product.season,
      careInstructions: product.careInstructions || [],
      pricing,
      availability,
      seo: product.seo,
      gender: product.gender,
      productType: product.productType,
      tags: product.tags || [],
      featured: product.featured || false,
      bestseller: product.bestseller || false,
      newArrival: product.newArrival || false,
      status: product.status,
      rating: (product as any).rating || 0,
      ratingCount: (product as any).ratingCount || 0,
      createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Resolve a public product by slug, enforcing public visibility server-side.
   */
  async getProductBySlug(
    slug: string,
    options: { preview?: boolean } = {}
  ): Promise<ProductDetailResult> {
    await connectToDatabase();

    const normalized = normalizeSlug(slug);
    const product = await productRepository.findBySlug(normalized, {
      includeInactive: options.preview,
    });

    if (!product) {
      throw new NotFoundError("Product", slug);
    }

    // Server-side visibility enforcement:
    // If not preview mode, product must be PUBLISHED, PUBLIC, and not soft-deleted
    if (!options.preview) {
      if (product.status !== ProductStatus.PUBLISHED || product.isDeleted) {
        throw new NotFoundError("Product", slug);
      }
      if (product.visibility && product.visibility !== ProductVisibility.PUBLIC) {
        throw new NotFoundError("Product", slug);
      }
    }

    // Resolve Brand, Categories, Collections, Variants in parallel
    const [brand, categories, collections, variants] = await Promise.all([
      product.brandId ? BrandModel.findById(product.brandId).lean<IBrand>() : null,
      CategoryModel.find({
        _id: { $in: product.categoryIds },
        active: true,
        isDeleted: false,
      }).lean<ICategory[]>(),
      FashionCollectionModel.find({
        $or: [
          { productIds: product._id },
          { _id: { $in: product.collectionIds || [] } },
        ],
        active: true,
        isDeleted: false,
      }).lean<IFashionCollection[]>(),
      productRepository.getVariantsByProductId(product._id.toString(), {
        activeOnly: !options.preview,
      }),
    ]);

    const productDTO = this.toProductDTO(product, variants, brand, categories, collections);
    const preview = toProductPreview(productDTO);

    // Resolve deterministic related products (same category or brand)
    const relatedProducts = await this.getRelatedProducts(product._id.toString(), {
      limit: 4,
    });

    // Build breadcrumbs with real category hierarchy and gender department
    const breadcrumbs: Array<{ label: string; href?: string }> = [
      { label: "Home", href: "/" },
    ];

    if (product.gender) {
      const genderLabel =
        product.gender === Gender.MEN
          ? "Men"
          : product.gender === Gender.WOMEN
          ? "Women"
          : product.gender === Gender.KIDS
          ? "Kids"
          : "Unisex";
      breadcrumbs.push({
        label: genderLabel,
        href: `/${product.gender.toLowerCase()}`,
      });
    }

    const primaryCategory = categories[0];
    if (primaryCategory) {
      // Walk up parent chain if present
      const categoryHierarchy: ICategory[] = [primaryCategory];
      let currentCat: ICategory | null = primaryCategory;
      const visited = new Set<string>([primaryCategory._id.toString()]);

      while (currentCat?.parentId) {
        const parentIdStr = currentCat.parentId.toString();
        if (visited.has(parentIdStr)) break;
        visited.add(parentIdStr);

        const parent: ICategory | null = await CategoryModel.findOne({
          _id: currentCat.parentId,
          active: true,
          isDeleted: false,
        }).lean<ICategory>();

        if (!parent) break;
        categoryHierarchy.unshift(parent);
        currentCat = parent;
      }

      for (const cat of categoryHierarchy) {
        breadcrumbs.push({
          label: cat.name,
          href: `/shop?category=${cat.slug}`,
        });
      }
    } else {
      breadcrumbs.push({ label: "Collections", href: "/shop" });
    }

    breadcrumbs.push({ label: product.name });

    return {
      product: productDTO,
      preview,
      relatedProducts,
      breadcrumbs,
    };
  }

  /**
   * Paginated product query for storefront browsing with batched population (0 N+1)
   */
  async getProducts(
    params: Partial<ProductListParams> = {}
  ): Promise<PaginatedResult<ProductPreview> & { dtos: ProductDTO[] }> {
    await connectToDatabase();

    const {
      page = 1,
      limit = 20,
      gender,
      tag,
      productType,
      newArrival,
      featured,
      bestseller,
      sale,
      sort = "recommended",
      categorySlug,
      collectionSlug,
      brandSlug,
    } = params;

    let categoryId = params.categoryId;
    let collectionId = params.collectionId;
    let brandId = params.brandId;

    // Resolve slugs to IDs if slugs were provided
    if (categorySlug && !categoryId) {
      const cat = await CategoryModel.findOne({ slug: categorySlug, active: true, isDeleted: false }).lean();
      if (cat) categoryId = cat._id.toString();
    }
    if (collectionSlug && !collectionId) {
      const col = await FashionCollectionModel.findOne({ slug: collectionSlug, active: true, isDeleted: false }).lean();
      if (col) collectionId = col._id.toString();
    }
    if (brandSlug && !brandId) {
      const br = await BrandModel.findOne({ slug: brandSlug, active: true, isDeleted: false }).lean();
      if (br) brandId = br._id.toString();
    }

    // Determine sort
    let sortBy = "createdAt";
    let sortOrder: "asc" | "desc" = "desc";
    if (sort === "newest") {
      sortBy = "createdAt";
      sortOrder = "desc";
    }

    const paginated = await productRepository.findPaginated(
      {
        gender,
        brandId,
        categoryId,
        collectionId,
        productType,
        featured,
        bestseller,
        newArrival,
        tags: tag ? [tag] : undefined,
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
      },
      {
        page,
        limit,
        sortBy,
        sortOrder,
      }
    );

    if (paginated.items.length === 0) {
      return {
        items: [],
        dtos: [],
        total: paginated.total,
        page: paginated.page,
        limit: paginated.limit,
        totalPages: paginated.totalPages,
        hasMore: paginated.hasMore,
      };
    }

    // Batch fetch related entities for all items to eliminate N+1 queries
    const productIds = paginated.items.map((p) => p._id.toString());
    const brandIds = Array.from(new Set(paginated.items.map((p) => p.brandId).filter(Boolean)));
    const categoryIds = Array.from(
      new Set(paginated.items.flatMap((p) => p.categoryIds || []).filter(Boolean))
    );

    const [variantsMap, brands, categoriesList] = await Promise.all([
      productRepository.getVariantsByProductIds(productIds, { activeOnly: true }),
      BrandModel.find({ _id: { $in: brandIds } }).lean<IBrand[]>(),
      CategoryModel.find({ _id: { $in: categoryIds }, active: true, isDeleted: false }).lean<ICategory[]>(),
    ]);

    const brandMap = new Map<string, IBrand>();
    for (const b of brands) brandMap.set(b._id.toString(), b);

    const categoryMap = new Map<string, ICategory>();
    for (const c of categoriesList) categoryMap.set(c._id.toString(), c);

    const dtos: ProductDTO[] = [];
    const previews: ProductPreview[] = [];

    for (const prod of paginated.items) {
      const pId = prod._id.toString();
      const pVariants = variantsMap.get(pId) || [];
      const pBrand = prod.brandId ? brandMap.get(prod.brandId.toString()) || null : null;
      const pCats = (prod.categoryIds || [])
        .map((id) => categoryMap.get(id.toString()))
        .filter((c): c is ICategory => Boolean(c));

      const dto = this.toProductDTO(prod, pVariants, pBrand, pCats, []);
      const preview = toProductPreview(dto);

      // If filtering by sale, check if product has genuine discount
      if (sale && !preview.isSale) {
        continue;
      }

      dtos.push(dto);
      previews.push(preview);
    }

    // If sorting by price (which is variant-level)
    if (sort === "price-low") {
      previews.sort((a, b) => a.currentPrice - b.currentPrice);
    } else if (sort === "price-high") {
      previews.sort((a, b) => b.currentPrice - a.currentPrice);
    }

    return {
      items: previews,
      dtos,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
      hasMore: paginated.hasMore,
    };
  }

  /**
   * Batch resolve ProductPreviews for a list of product IDs, preserving original ID ordering
   * and enforcing public visibility (0 N+1 queries).
   */
  async getProductPreviewsByIds(productIds: string[]): Promise<ProductPreview[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }
    await connectToDatabase();

    const uniqueIds = Array.from(new Set(productIds));
    const products: IProduct[] = await ProductModel.find({
      _id: { $in: uniqueIds },
      isDeleted: false,
      status: ProductStatus.PUBLISHED,
      visibility: ProductVisibility.PUBLIC,
    }).lean<IProduct[]>();

    if (products.length === 0) {
      return [];
    }

    const fetchedIds = products.map((p: IProduct) => p._id.toString());
    const brandIds = Array.from(new Set(products.map((p: IProduct) => p.brandId).filter(Boolean)));
    const categoryIds = Array.from(
      new Set(products.flatMap((p: IProduct) => p.categoryIds || []).filter(Boolean))
    );

    const [variantsMap, brands, categoriesList] = await Promise.all([
      productRepository.getVariantsByProductIds(fetchedIds, { activeOnly: true }),
      BrandModel.find({ _id: { $in: brandIds } }).lean<IBrand[]>(),
      CategoryModel.find({ _id: { $in: categoryIds }, active: true, isDeleted: false }).lean<ICategory[]>(),
    ]);

    const brandMap = new Map<string, IBrand>();
    for (const b of brands) brandMap.set(b._id.toString(), b);

    const categoryMap = new Map<string, ICategory>();
    for (const c of categoriesList) categoryMap.set(c._id.toString(), c);

    const previewMap = new Map<string, ProductPreview>();
    for (const prod of products) {
      const pId = prod._id.toString();
      const pVariants = variantsMap.get(pId) || [];
      const pBrand = prod.brandId ? brandMap.get(prod.brandId.toString()) || null : null;
      const pCats = (prod.categoryIds || [])
        .map((id: unknown) => categoryMap.get(String(id)))
        .filter((c): c is ICategory => Boolean(c));

      const dto = this.toProductDTO(prod, pVariants, pBrand, pCats, []);
      previewMap.set(pId, toProductPreview(dto));
    }

    // Preserve the original ordering of productIds, filtering out any inactive/deleted products
    const orderedPreviews: ProductPreview[] = [];
    for (const id of productIds) {
      const p = previewMap.get(id);
      if (p) {
        orderedPreviews.push(p);
      }
    }

    return orderedPreviews;
  }

  /**
   * Get products by category slug
   */
  async getProductsByCategory(
    categorySlug: string,
    params: Partial<ProductListParams> = {}
  ): Promise<{
    category: ICategory;
    products: PaginatedResult<ProductPreview>;
  }> {
    await connectToDatabase();
    const category = await categoryRepository.findBySlug(categorySlug);
    if (!category || !category.active) {
      throw new NotFoundError("Category", categorySlug);
    }

    const products = await this.getProducts({
      ...params,
      categoryId: category._id.toString(),
    });

    return {
      category,
      products,
    };
  }

  /**
   * Get products by collection slug
   */
  async getProductsByCollection(
    collectionSlug: string,
    params: Partial<ProductListParams> = {}
  ): Promise<{
    collection: IFashionCollection;
    products: PaginatedResult<ProductPreview>;
  }> {
    await connectToDatabase();
    const collection = await FashionCollectionModel.findOne({
      slug: collectionSlug,
      active: true,
      isDeleted: false,
    }).lean<IFashionCollection>();

    if (!collection) {
      throw new NotFoundError("Collection", collectionSlug);
    }

    const products = await this.getProducts({
      ...params,
      collectionId: collection._id.toString(),
    });

    return {
      collection,
      products,
    };
  }

  /**
   * Get canonical new arrivals
   */
  async getNewArrivals(
    params: Partial<ProductListParams> = {}
  ): Promise<PaginatedResult<ProductPreview>> {
    return this.getProducts({
      ...params,
      newArrival: true,
      sort: "newest",
    });
  }

  /**
   * Get canonical sale products
   */
  async getSaleProducts(
    params: Partial<ProductListParams> = {}
  ): Promise<PaginatedResult<ProductPreview>> {
    return this.getProducts({
      ...params,
      sale: true,
    });
  }

  /**
   * Get featured products for discovery carousels
   */
  async getFeaturedProducts(limit = 8): Promise<ProductPreview[]> {
    const result = await this.getProducts({
      featured: true,
      limit,
    });
    return result.items;
  }

  /**
   * Get related products based on category/brand
   */
  async getRelatedProducts(
    productId: string,
    options: { limit?: number } = {}
  ): Promise<ProductPreview[]> {
    await connectToDatabase();
    const limit = options.limit || 4;

    const currentProduct = await productRepository.findById(productId, { includeInactive: true });
    if (!currentProduct) return [];

    const categoryId = currentProduct.categoryIds[0]?.toString();
    const queryResult = await this.getProducts({
      categoryId,
      gender: currentProduct.gender,
      limit: limit + 1,
    });

    return queryResult.items.filter((p) => p.id !== productId).slice(0, limit);
  }

  // -------------------------------------------------------------
  // ADMIN CATALOG MUTATIONS (Protected by Phase 5 RBAC)
  // -------------------------------------------------------------

  /**
   * Create product (Admin)
   */
  async createProduct(input: CreateProductInput): Promise<ProductDTO> {
    await connectToDatabase();
    const validated = validateData(CreateProductInputSchema, input);

    // Enforce unique slug
    const existingSlug = await productRepository.findBySlug(validated.slug, { includeInactive: true });
    if (existingSlug) {
      throw new ConflictError(`Product with slug '${validated.slug}' already exists`);
    }

    const created = await productRepository.createProduct(validated as unknown as Partial<IProduct>);
    logger.info("Admin created new product", { productId: created._id, slug: created.slug }, "ProductService");

    return this.toProductDTO(created, [], null, []);
  }

  /**
   * Update product (Admin)
   */
  async updateProduct(id: string, input: UpdateProductInput): Promise<ProductDTO> {
    await connectToDatabase();

    const existing = await productRepository.findById(id, { includeInactive: true });
    if (!existing) {
      throw new NotFoundError("Product", id);
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugExists = await productRepository.findBySlug(input.slug, { includeInactive: true });
      if (slugExists && slugExists._id.toString() !== id) {
        throw new ConflictError(`Product with slug '${input.slug}' already exists`);
      }
    }

    const updated = await productRepository.updateProduct(id, input as unknown as Partial<IProduct>);
    if (!updated) {
      throw new NotFoundError("Product", id);
    }

    logger.info("Admin updated product", { productId: id }, "ProductService");
    const variants = await productRepository.getVariantsByProductId(id, { activeOnly: false });
    return this.toProductDTO(updated, variants, null, []);
  }

  /**
   * Soft delete / archive product (Admin)
   */
  async archiveProduct(id: string): Promise<boolean> {
    await connectToDatabase();
    const existing = await productRepository.findById(id, { includeInactive: true });
    if (!existing) {
      throw new NotFoundError("Product", id);
    }

    const success = await productRepository.softDelete(id);
    logger.info("Admin archived product", { productId: id, success }, "ProductService");
    return success;
  }

  /**
   * Publish product (Admin)
   */
  async publishProduct(id: string): Promise<ProductDTO> {
    await connectToDatabase();
    const updated = await productRepository.updateProduct(id, {
      status: ProductStatus.PUBLISHED,
      visibility: ProductVisibility.PUBLIC,
    });
    if (!updated) {
      throw new NotFoundError("Product", id);
    }
    const variants = await productRepository.getVariantsByProductId(id, { activeOnly: false });
    return this.toProductDTO(updated, variants, null, []);
  }

  /**
   * Create variant for a product (Admin)
   */
  async createVariant(productId: string, input: CreateVariantInput): Promise<ProductVariantDTO> {
    await connectToDatabase();
    const validated = validateData(CreateVariantInputSchema, input);

    const product = await productRepository.findById(productId, { includeInactive: true });
    if (!product) {
      throw new NotFoundError("Product", productId);
    }

    // Color and size canonical normalization
    const normalizedColor = {
      name: variantService.normalizeColorName(validated.color.name),
      slug: variantService.normalizeColorSlug(validated.color.slug || validated.color.name),
      hexCode: variantService.normalizeHexCode(validated.color.hexCode),
      secondaryHexCode: validated.color.secondaryHexCode
        ? variantService.normalizeHexCode(validated.color.secondaryHexCode)
        : undefined,
    };
    const normalizedSize = validated.size.trim().toUpperCase();

    // Deterministic SKU generation if omitted
    const sku = (validated.sku?.trim().toUpperCase()) || variantService.generateSku({
      productSlugOrType: product.slug,
      colorSlugOrName: normalizedColor.slug,
      size: normalizedSize,
    });

    // Check SKU uniqueness
    const existingSku = await productRepository.findVariantBySku(sku);
    if (existingSku) {
      throw new ConflictError(`Variant SKU '${sku}' already exists`);
    }

    // Check color + size compound uniqueness
    const existingVariants = await productRepository.getVariantsByProductId(productId, { activeOnly: false });
    const duplicate = existingVariants.find(
      (v) =>
        variantService.normalizeColorSlug(v.color.slug || v.color.name) === normalizedColor.slug &&
        v.size.trim().toUpperCase() === normalizedSize
    );
    if (duplicate) {
      throw new ConflictError(
        `Variant with color '${normalizedColor.name}' and size '${normalizedSize}' already exists for this product`
      );
    }

    const variantData = {
      ...validated,
      productId: product._id,
      sku,
      color: normalizedColor,
      size: normalizedSize,
    };

    const created = await productRepository.createVariant(variantData as unknown as Partial<IProductVariant>);
    logger.info("Admin created variant", { variantId: created._id, sku: created.sku }, "ProductService");

    return {
      id: created._id.toString(),
      productId,
      sku: created.sku,
      color: created.color,
      size: created.size,
      variantImages: created.variantImages || [],
      mrp: minorToMajor(created.mrp),
      sellingPrice: minorToMajor(created.sellingPrice),
      mrpMinor: created.mrp,
      sellingPriceMinor: created.sellingPrice,
      discountPercent: calculateDiscountPercent(created.mrp, created.sellingPrice),
      status: created.status,
      active: created.active,
      available: created.active && created.status === VariantStatus.ACTIVE,
    };
  }

  /**
   * Update variant (Admin)
   */
  async updateVariant(id: string, input: UpdateVariantInput): Promise<ProductVariantDTO> {
    await connectToDatabase();
    const existing = await productRepository.findVariantById(id);
    if (!existing) {
      throw new NotFoundError("ProductVariant", id);
    }

    let sku = existing.sku;
    if (input.sku && input.sku.trim().toUpperCase() !== existing.sku) {
      sku = input.sku.trim().toUpperCase();
      const existingSku = await productRepository.findVariantBySku(sku);
      if (existingSku && existingSku._id.toString() !== id) {
        throw new ConflictError(`Variant SKU '${sku}' already exists`);
      }
    }

    // Check color/size change duplicate
    const newColor = input.color
      ? {
          name: variantService.normalizeColorName(input.color.name),
          slug: variantService.normalizeColorSlug(input.color.slug || input.color.name),
          hexCode: variantService.normalizeHexCode(input.color.hexCode),
          secondaryHexCode: input.color.secondaryHexCode
            ? variantService.normalizeHexCode(input.color.secondaryHexCode)
            : undefined,
        }
      : existing.color;

    const newSize = input.size ? input.size.trim().toUpperCase() : existing.size;

    if (input.color || input.size) {
      const existingVariants = await productRepository.getVariantsByProductId(
        existing.productId.toString(),
        { activeOnly: false }
      );
      const duplicate = existingVariants.find(
        (v) =>
          v._id.toString() !== id &&
          variantService.normalizeColorSlug(v.color.slug || v.color.name) === newColor.slug &&
          v.size.trim().toUpperCase() === newSize
      );
      if (duplicate) {
        throw new ConflictError(
          `Variant with color '${newColor.name}' and size '${newSize}' already exists for this product`
        );
      }
    }

    const updatePayload: Partial<IProductVariant> = {
      ...input,
      ...(input.sku ? { sku } : {}),
      ...(input.color ? { color: newColor } : {}),
      ...(input.size ? { size: newSize } : {}),
    };

    const updated = await productRepository.updateVariant(id, updatePayload);
    if (!updated) {
      throw new NotFoundError("ProductVariant", id);
    }

    return {
      id: updated._id.toString(),
      productId: updated.productId.toString(),
      sku: updated.sku,
      color: updated.color,
      size: updated.size,
      variantImages: updated.variantImages || [],
      mrp: minorToMajor(updated.mrp),
      sellingPrice: minorToMajor(updated.sellingPrice),
      mrpMinor: updated.mrp,
      sellingPriceMinor: updated.sellingPrice,
      discountPercent: calculateDiscountPercent(updated.mrp, updated.sellingPrice),
      status: updated.status,
      active: updated.active,
      available: updated.active && updated.status === VariantStatus.ACTIVE,
    };
  }

  /**
   * Archive / soft delete variant (Admin)
   */
  async archiveVariant(id: string): Promise<boolean> {
    await connectToDatabase();
    const existing = await productRepository.findVariantById(id);
    if (!existing) {
      throw new NotFoundError("ProductVariant", id);
    }

    return productRepository.softDeleteVariant(id);
  }

  /**
   * Get active variants, matrix, and dimension rules for a published product
   */
  async getVariantsByProductSlug(slug: string): Promise<{
    product: ProductDTO;
    variants: ProductVariantDTO[];
    matrix: VariantMatrix;
    dimensions: VariantDimensionsScheme;
  }> {
    const detail = await this.getProductBySlug(slug);
    const matrix = variantService.buildVariantMatrix(detail.product.variants);
    const dimensions = variantService.getProductVariantDimensions(
      detail.product.productType,
      detail.product.variants
    );

    return {
      product: detail.product,
      variants: detail.product.variants,
      matrix,
      dimensions,
    };
  }

  /**
   * Resolve a specific color and size combination for a product
   */
  async resolveProductVariant(
    slug: string,
    color: string,
    size: string
  ): Promise<ResolvedVariantResult> {
    const detail = await this.getProductBySlug(slug);
    return variantService.resolveVariant({
      color,
      size,
      variants: detail.product.variants,
    });
  }

  /**
   * Get all variants for a product including inactive (Admin)
   */
  async getAdminVariantsForProduct(productId: string): Promise<{
    product: IProduct;
    variants: ProductVariantDTO[];
    matrix: VariantMatrix;
  }> {
    await connectToDatabase();
    const product = await productRepository.findById(productId, { includeInactive: true });
    if (!product) {
      throw new NotFoundError("Product", productId);
    }

    const rawVariants = await productRepository.getVariantsByProductId(productId, {
      activeOnly: false,
    });
    const variantDTOs: ProductVariantDTO[] = rawVariants.map((v) => ({
      id: v._id.toString(),
      productId: v.productId.toString(),
      sku: v.sku,
      color: v.color,
      size: v.size,
      variantImages: v.variantImages || [],
      mrp: minorToMajor(v.mrp),
      sellingPrice: minorToMajor(v.sellingPrice),
      mrpMinor: v.mrp,
      sellingPriceMinor: v.sellingPrice,
      discountPercent: calculateDiscountPercent(v.mrp, v.sellingPrice),

      status: v.status,
      active: v.active,
      available: v.active && v.status === VariantStatus.ACTIVE,
    }));

    const matrix = variantService.buildVariantMatrix(variantDTOs);

    return {
      product,
      variants: variantDTOs,
      matrix,
    };
  }
}


export const productService = new ProductService();
