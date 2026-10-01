/**
 * VÉRONA — Admin Catalog Management Types & DTOs (Phase 28)
 */

import { Gender, ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { ISeoMetadata, IProductSpecification, IProductImage, IVariantColor, MinorUnits } from "@/types/database";

export interface AdminProductListItemDTO {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  visibility: ProductVisibility;
  brandName: string;
  brandId: string;
  categoryNames: string[];
  categoryIds: string[];
  gender: Gender;
  productType: string;
  primaryImage: string;
  variantCount: number;
  totalStock: number;
  priceRange: {
    minSellingPriceMinor: MinorUnits;
    maxSellingPriceMinor: MinorUnits;
    formatted: string;
  };
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDetailDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  brandId: string;
  brandName?: string;
  categoryIds: string[];
  categoryNames?: string[];
  collectionIds: string[];
  collectionNames?: string[];
  gender: Gender;
  productType: string;
  fabric?: string;
  fit?: string;
  pattern?: string;
  occasion?: string;
  season?: string;
  tags: string[];
  images: IProductImage[];
  careInstructions: string[];
  specifications: IProductSpecification[];
  seo?: ISeoMetadata;
  status: ProductStatus;
  visibility: ProductVisibility;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  variants: AdminVariantDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminVariantDTO {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  color: IVariantColor;
  size: string;
  variantImages: string[];
  priceOverride: boolean;
  mrp: MinorUnits;
  sellingPrice: MinorUnits;
  costPrice?: MinorUnits;
  mrpFormatted: string;
  sellingPriceFormatted: string;
  discountPercent: number;
  weightInGrams?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  status: VariantStatus;
  active: boolean;
  availableStock?: number;
}

export interface AdminCategoryListItemDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  parentName?: string;
  image?: string;
  banner?: string;
  gender: Gender;
  sortOrder: number;
  active: boolean;
  productCount: number;
  seo?: ISeoMetadata;
}

export interface AdminCollectionListItemDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  heroImage: string;
  banner?: string;
  productIds: string[];
  categoryIds: string[];
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder: number;
  productCount: number;
  seo?: ISeoMetadata;
}

export interface AdminBrandListItemDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo: string;
  banner?: string;
  website?: string;
  active: boolean;
  sortOrder: number;
  productCount: number;
  seo?: ISeoMetadata;
}

export interface BulkOperationResultDTO {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}
