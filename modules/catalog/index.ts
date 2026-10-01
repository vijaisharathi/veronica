/**
 * VÉRONA — Catalog Module Exports
 *
 * Central barrel for all catalog domain services, DTOs, and validations.
 */

export { categoryService, CategoryService } from "./category.service";
export type { CategoryDTO, CategoryTreeDTO, CategoryBrowseResult } from "./category.service";

export { collectionService, CollectionService } from "./collection.service";
export type { CollectionDTO, CollectionDetailResult } from "./collection.service";

export { productService, ProductService } from "./product.service";
export type { ProductDetailResult } from "./product.service";

export { variantService, VariantService } from "./variant.service";
export { SizeScheme, VariantDimensionType } from "./variant.types";
export type {
  CanonicalColor,
  CanonicalSize,
  VariantMatrix,
  VariantMatrixCell,
  ResolvedVariantResult,
  VariantDimensionsScheme,
  CreateVariantWithSkuPreviewInput,
} from "./variant.types";

export { toProductPreview } from "./product.dto";
export type {
  ProductDTO,
  ProductVariantDTO,
  ProductMediaDTO,
  ProductBrandDTO,
  ProductCategoryDTO,
  ProductCollectionDTO,
  ProductPricingDTO,
  ProductAvailabilityDTO,
  ProductAttributeDTO,
} from "./product.dto";

export {
  CreateProductInputSchema,
  UpdateProductInputSchema,
  CreateVariantInputSchema,
  UpdateVariantInputSchema,
  ProductListQuerySchema,
  VariantResolutionQuerySchema,
} from "./catalog.validation";
export type {
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
  ProductListParams,
  VariantResolutionQuery,
} from "./catalog.validation";

