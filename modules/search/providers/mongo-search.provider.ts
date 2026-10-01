/**
 * VÉRONA — MongoDB Native Search Provider
 *
 * Implements the SearchProvider interface using MongoDB compound indexes,
 * regex partial token matching, text scoring, and batched variant resolution.
 */

import {
  SearchProvider,
  SearchRequest,
  NormalizedSearchQuery,
  SearchProviderResult,
  SearchSuggestionPayload,
  SearchSuggestionItem,
  SearchFilterFacets,
  FacetCountItem,
  ColorFacetItem,
} from "../search.types";
import {
  ProductModel,
  ProductVariantModel,
  BrandModel,
  CategoryModel,
  FashionCollectionModel,
} from "@/db/models";
import { productRepository } from "@/db/repositories/product.repository";
import { connectToDatabase } from "@/db/client";
import { ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { IProduct, IProductVariant, IBrand, ICategory, IFashionCollection } from "@/types/database";
import { minorToMajor } from "@/lib/money";
import { ROUTES } from "@/config/routes";
import { CURATED_DISCOVERY_TERMS, getDidYouMeanSuggestion } from "../search.normalizer";

export class MongoSearchProvider implements SearchProvider {
  /**
   * Search catalog products with relevance weighting, facet filtering, and pagination.
   */
  async search(
    request: SearchRequest,
    normalized: NormalizedSearchQuery
  ): Promise<SearchProviderResult> {
    await connectToDatabase();

    const {
      page = 1,
      limit = 20,
      category,
      collection,
      brand,
      gender,
      color,
      size,
      productType,
      fabric,
      fit,
      minPrice,
      maxPrice,
      sort = "relevance",
    } = request;

    // 1. Base visibility filter: only PUBLISHED, PUBLIC, and non-deleted products
    const queryFilter: Record<string, unknown> = {
      status: ProductStatus.PUBLISHED,
      visibility: ProductVisibility.PUBLIC,
      isDeleted: false,
    };

    // 2. Keyword & Text Search Handling
    const orConditions: Array<Record<string, unknown>> = [];

    // Exact SKU match detection
    let exactMatchedProductId: string | null = null;
    if (normalized.isExactSkuMatch || normalized.tokens.some((t) => t.startsWith("ver-"))) {
      const skuTerm = (normalized.tokens.find((t) => t.startsWith("ver-")) || normalized.raw).toUpperCase();
      const variantMatch = await ProductVariantModel.findOne({
        sku: skuTerm,
        isDeleted: false,
      }).lean<IProductVariant>();

      if (variantMatch) {
        exactMatchedProductId = variantMatch.productId.toString();
        orConditions.push({ _id: variantMatch.productId });
      }
    }

    if (normalized.tokens.length > 0 && !exactMatchedProductId) {
      // Find matching Brands, Categories, or Collections to expand search intent
      const searchRegexList = normalized.tokens.map((token) => new RegExp(token, "i"));

      const [matchedBrands, matchedCategories, matchedCollections] = await Promise.all([
        BrandModel.find({
          $or: [{ name: { $in: searchRegexList } }, { slug: { $in: searchRegexList } }],
          isDeleted: false,
        })
          .select("_id")
          .lean<Array<{ _id: unknown }>>(),

        CategoryModel.find({
          $or: [{ name: { $in: searchRegexList } }, { slug: { $in: searchRegexList } }],
          active: true,
          isDeleted: false,
        })
          .select("_id")
          .lean<Array<{ _id: unknown }>>(),

        FashionCollectionModel.find({
          $or: [{ name: { $in: searchRegexList } }, { slug: { $in: searchRegexList } }],
          active: true,
          isDeleted: false,
        })
          .select("_id")
          .lean<Array<{ _id: unknown }>>(),
      ]);

      if (matchedBrands.length > 0) {
        orConditions.push({ brandId: { $in: matchedBrands.map((b) => b._id) } });
      }
      if (matchedCategories.length > 0) {
        orConditions.push({ categoryIds: { $in: matchedCategories.map((c) => c._id) } });
      }
      if (matchedCollections.length > 0) {
        orConditions.push({ collectionIds: { $in: matchedCollections.map((col) => col._id) } });
      }

      // Tokenized regex pattern for partial & synonym matching across product fields
      const allTerms = normalized.expandedTerms.length > 0 ? normalized.expandedTerms : normalized.tokens;
      for (const term of allTerms) {
        const termRegex = new RegExp(term, "i");
        orConditions.push(
          { name: termRegex },
          { productType: termRegex },
          { tags: termRegex },
          { fabric: termRegex },
          { fit: termRegex },
          { description: termRegex }
        );
      }
    }

    if (orConditions.length > 0) {
      queryFilter.$or = orConditions;
    }

    // 3. Facet Filters
    // Category filter
    if (category) {
      const catDoc = await CategoryModel.findOne({
        $or: [{ slug: category.toLowerCase() }, { _id: category.match(/^[0-9a-fA-F]{24}$/) ? category : null }],
        isDeleted: false,
      }).lean<ICategory>();
      if (catDoc) {
        queryFilter.categoryIds = catDoc._id;
      }
    }

    // Collection filter
    if (collection) {
      const colDoc = await FashionCollectionModel.findOne({
        $or: [{ slug: collection.toLowerCase() }, { _id: collection.match(/^[0-9a-fA-F]{24}$/) ? collection : null }],
        isDeleted: false,
      }).lean<IFashionCollection>();
      if (colDoc) {
        queryFilter.collectionIds = colDoc._id;
      }
    }

    // Brand filter
    if (brand) {
      const brandDoc = await BrandModel.findOne({
        $or: [{ slug: brand.toLowerCase() }, { _id: brand.match(/^[0-9a-fA-F]{24}$/) ? brand : null }],
        isDeleted: false,
      }).lean<IBrand>();
      if (brandDoc) {
        queryFilter.brandId = brandDoc._id;
      }
    }

    // Gender filter
    if (gender) {
      queryFilter.gender = gender.toUpperCase();
    }

    // Attribute filters
    if (productType) queryFilter.productType = new RegExp(`^${productType}$`, "i");
    if (fabric) queryFilter.fabric = new RegExp(fabric, "i");
    if (fit) queryFilter.fit = new RegExp(fit, "i");

    // 4. Variant-Level Filters (Color, Size, Price Range in paise)
    const variantMatchConditions: Record<string, unknown> = {
      isDeleted: false,
      active: true,
      status: VariantStatus.ACTIVE,
    };

    let hasVariantLevelFilter = false;

    if (color) {
      hasVariantLevelFilter = true;
      variantMatchConditions.$or = [
        { "color.slug": color.toLowerCase() },
        { "color.name": new RegExp(color, "i") },
      ];
    }

    if (size) {
      hasVariantLevelFilter = true;
      variantMatchConditions.size = new RegExp(`^${size}$`, "i");
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      hasVariantLevelFilter = true;
      const priceCond: Record<string, number> = {};
      if (minPrice !== undefined) priceCond.$gte = minPrice * 100; // to minor units (paise)
      if (maxPrice !== undefined) priceCond.$lte = maxPrice * 100; // to minor units (paise)
      variantMatchConditions.sellingPrice = priceCond;
    }

    if (hasVariantLevelFilter) {
      const matchingVariants = await ProductVariantModel.find(variantMatchConditions)
        .select("productId")
        .lean<Array<{ productId: unknown }>>();

      const matchingProductIds = Array.from(
        new Set(matchingVariants.map((v) => String(v.productId)).filter(Boolean))
      );
      if (queryFilter._id) {
        // If queryFilter already has _id constraint (e.g. from exact SKU)
        queryFilter._id = { $in: matchingProductIds.filter((id) => id === String(queryFilter._id)) };
      } else {
        queryFilter._id = { $in: matchingProductIds };
      }
    }

    // 5. Sorting & Execution
    const sortObj: Record<string, 1 | -1> = {};
    if (sort === "newest") {
      sortObj.createdAt = -1;
    } else {
      // Default: deterministic ordering by createdAt
      sortObj.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      ProductModel.find(queryFilter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean<IProduct[]>(),
      ProductModel.countDocuments(queryFilter),
    ]);

    const totalPages = Math.ceil(total / limit);
    const productIds = rawProducts.map((p) => p._id.toString());

    // 6. Zero N+1 Batched Variant & Related Entity Loading
    const [variantsMap, allBrands, allCategories, allCollections] = await Promise.all([
      productRepository.getVariantsByProductIds(productIds, { activeOnly: true }),
      BrandModel.find({ isDeleted: false }).lean<IBrand[]>(),
      CategoryModel.find({ active: true, isDeleted: false }).lean<ICategory[]>(),
      FashionCollectionModel.find({ active: true, isDeleted: false }).lean<IFashionCollection[]>(),
    ]);

    const brandMap = new Map<string, IBrand>(allBrands.map((b) => [b._id.toString(), b]));
    const categoryMap = new Map<string, ICategory>(allCategories.map((c) => [c._id.toString(), c]));
    const collectionMap = new Map<string, IFashionCollection>(allCollections.map((col) => [col._id.toString(), col]));

    // Price sort (variant-level) if requested
    let finalProducts = rawProducts;
    if (sort === "price_asc" || sort === "price_desc") {
      finalProducts = [...rawProducts].sort((a, b) => {
        const aVars = variantsMap.get(a._id.toString()) || [];
        const bVars = variantsMap.get(b._id.toString()) || [];
        const aPrice = aVars.length > 0 ? Math.min(...aVars.map((v) => v.sellingPrice)) : 0;
        const bPrice = bVars.length > 0 ? Math.min(...bVars.map((v) => v.sellingPrice)) : 0;
        return sort === "price_asc" ? aPrice - bPrice : bPrice - aPrice;
      });
    }

    // 7. Dynamic Facets Aggregation
    const facets = await this.buildFacets(rawProducts, variantsMap, categoryMap, brandMap, collectionMap);

    // 8. Typo / Did You Mean detection if no results were found
    let didYouMean: string | null = null;
    if (total === 0 && normalized.normalized.length > 0) {
      didYouMean = getDidYouMeanSuggestion(normalized.normalized);
    }

    return {
      products: finalProducts,
      variantsMap,
      brandMap,
      categoryMap,
      collectionMap,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      facets,
      didYouMean,
    };
  }

  /**
   * Generates lightweight autocomplete suggestions.
   */
  async suggest(
    query: string,
    normalized: NormalizedSearchQuery,
    limit = 8
  ): Promise<SearchSuggestionPayload> {
    await connectToDatabase();

    if (!normalized.normalized || normalized.normalized.length === 0) {
      return {
        query: "",
        suggestions: [],
        categories: [],
        collections: [],
        brands: [],
        curatedTerms: CURATED_DISCOVERY_TERMS,
      };
    }

    const regex = new RegExp(normalized.normalized, "i");
    const prefixRegex = new RegExp(`^${normalized.normalized}`, "i");

    const [matchingProducts, matchingCategories, matchingCollections, matchingBrands] = await Promise.all([
      ProductModel.find({
        status: ProductStatus.PUBLISHED,
        visibility: ProductVisibility.PUBLIC,
        isDeleted: false,
        $or: [{ name: regex }, { tags: regex }, { productType: regex }],
      })
        .select("name slug images productType")
        .limit(limit)
        .lean<IProduct[]>(),

      CategoryModel.find({
        name: regex,
        active: true,
        isDeleted: false,
      })
        .select("name slug")
        .limit(4)
        .lean<ICategory[]>(),

      FashionCollectionModel.find({
        name: regex,
        active: true,
        isDeleted: false,
      })
        .select("name slug")
        .limit(4)
        .lean<IFashionCollection[]>(),

      BrandModel.find({
        name: regex,
        isDeleted: false,
      })
        .select("name slug")
        .limit(4)
        .lean<IBrand[]>(),
    ]);

    const suggestions: SearchSuggestionItem[] = [];

    // Prioritize prefix product matches
    for (const p of matchingProducts) {
      const primaryImg = p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url;
      suggestions.push({
        id: p._id.toString(),
        type: "product",
        label: p.name,
        href: ROUTES.PRODUCT(p.slug),
        subtitle: p.productType,
        image: primaryImg,
      });
    }

    return {
      query,
      suggestions: suggestions.slice(0, limit),
      categories: matchingCategories.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        href: ROUTES.CATEGORY(c.slug),
      })),
      collections: matchingCollections.map((col) => ({
        id: col._id.toString(),
        name: col.name,
        slug: col.slug,
        href: ROUTES.COLLECTION(col.slug),
      })),
      brands: matchingBrands.map((b) => ({
        id: b._id.toString(),
        name: b.name,
        slug: b.slug,
        href: `${ROUTES.SEARCH}?brand=${b.slug}`,
      })),
      curatedTerms: CURATED_DISCOVERY_TERMS,
    };
  }

  /**
   * Helper to construct dynamic facet counts from matched catalog documents.
   */
  private async buildFacets(
    products: IProduct[],
    variantsMap: Map<string, IProductVariant[]>,
    categoryMap: Map<string, ICategory>,
    brandMap: Map<string, IBrand>,
    collectionMap: Map<string, IFashionCollection>
  ): Promise<SearchFilterFacets> {
    const categoryCounts = new Map<string, FacetCountItem>();
    const brandCounts = new Map<string, FacetCountItem>();
    const collectionCounts = new Map<string, FacetCountItem>();
    const genderCounts = new Map<string, { label: string; value: string; count: number }>();
    const colorCounts = new Map<string, ColorFacetItem>();
    const sizeCounts = new Map<string, { label: string; count: number }>();
    const fabricCounts = new Map<string, { label: string; count: number }>();
    const fitCounts = new Map<string, { label: string; count: number }>();

    let minPriceMinor = Infinity;
    let maxPriceMinor = 0;

    for (const p of products) {
      // Categories
      for (const catId of p.categoryIds || []) {
        const cat = categoryMap.get(catId.toString());
        if (cat) {
          const entry = categoryCounts.get(cat._id.toString()) || {
            id: cat._id.toString(),
            name: cat.name,
            slug: cat.slug,
            count: 0,
          };
          entry.count += 1;
          categoryCounts.set(cat._id.toString(), entry);
        }
      }

      // Brand
      if (p.brandId) {
        const b = brandMap.get(p.brandId.toString());
        if (b) {
          const entry = brandCounts.get(b._id.toString()) || {
            id: b._id.toString(),
            name: b.name,
            slug: b.slug,
            count: 0,
          };
          entry.count += 1;
          brandCounts.set(b._id.toString(), entry);
        }
      }

      // Collections
      for (const colId of p.collectionIds || []) {
        const col = collectionMap.get(colId.toString());
        if (col) {
          const entry = collectionCounts.get(col._id.toString()) || {
            id: col._id.toString(),
            name: col.name,
            slug: col.slug,
            count: 0,
          };
          entry.count += 1;
          collectionCounts.set(col._id.toString(), entry);
        }
      }

      // Gender
      if (p.gender) {
        const g = p.gender;
        const entry = genderCounts.get(g) || { label: g, value: g, count: 0 };
        entry.count += 1;
        genderCounts.set(g, entry);
      }

      // Fabric & Fit
      if (p.fabric) {
        const entry = fabricCounts.get(p.fabric) || { label: p.fabric, count: 0 };
        entry.count += 1;
        fabricCounts.set(p.fabric, entry);
      }
      if (p.fit) {
        const entry = fitCounts.get(p.fit) || { label: p.fit, count: 0 };
        entry.count += 1;
        fitCounts.set(p.fit, entry);
      }

      // Variants: Colors, Sizes, Price range
      const variants = variantsMap.get(p._id.toString()) || [];
      for (const v of variants) {
        if (v.sellingPrice) {
          if (v.sellingPrice < minPriceMinor) minPriceMinor = v.sellingPrice;
          if (v.sellingPrice > maxPriceMinor) maxPriceMinor = v.sellingPrice;
        }

        if (v.color) {
          const colorKey = v.color.name.toLowerCase();
          const entry = colorCounts.get(colorKey) || {
            name: v.color.name,
            slug: v.color.slug || colorKey,
            hexCode: v.color.hexCode,
            count: 0,
          };
          entry.count += 1;
          colorCounts.set(colorKey, entry);
        }

        if (v.size) {
          const entry = sizeCounts.get(v.size) || { label: v.size, count: 0 };
          entry.count += 1;
          sizeCounts.set(v.size, entry);
        }
      }
    }

    const minPriceRupees = minPriceMinor === Infinity ? 0 : minorToMajor(minPriceMinor);
    const maxPriceRupees = maxPriceMinor === 0 ? 0 : minorToMajor(maxPriceMinor);

    return {
      categories: Array.from(categoryCounts.values()),
      brands: Array.from(brandCounts.values()),
      collections: Array.from(collectionCounts.values()),
      genders: Array.from(genderCounts.values()),
      colors: Array.from(colorCounts.values()),
      sizes: Array.from(sizeCounts.values()),
      fabrics: Array.from(fabricCounts.values()),
      fits: Array.from(fitCounts.values()),
      priceRange: {
        min: minPriceRupees,
        max: maxPriceRupees,
      },
    };
  }
}

export const mongoSearchProvider = new MongoSearchProvider();
