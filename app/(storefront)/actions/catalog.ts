/**
 * VÉRONA — Category & Collection Server Actions
 *
 * Next.js Server Actions providing data-fetching for storefront category
 * and collection pages. These bridge the domain services with the UI layer.
 *
 * All functions run on the server and return serializable DTOs.
 */

"use server";

import { categoryService } from "@/modules/catalog/category.service";
import { collectionService } from "@/modules/catalog/collection.service";
import type { CategoryDTO, CategoryBrowseResult, CategoryTreeDTO } from "@/modules/catalog/category.service";
import type { CollectionDTO, CollectionDetailResult } from "@/modules/catalog/collection.service";
import { Gender } from "@/constants/status";
import { logger } from "@/lib/logger";

// ---------- Category Actions ----------

/**
 * Fetch a category by slug with subcategories and breadcrumbs.
 */
export async function fetchCategoryBySlug(
  slug: string
): Promise<{ data: CategoryBrowseResult | null; error: string | null }> {
  try {
    const result = await categoryService.getCategoryBySlug(slug);
    return { data: result, error: null };
  } catch (err) {
    logger.error("fetchCategoryBySlug failed", { slug, error: err }, "ServerAction");
    return { data: null, error: "Category not found" };
  }
}

/**
 * Fetch root categories for a gender department.
 */
export async function fetchRootCategories(
  gender?: Gender
): Promise<{ data: CategoryDTO[]; error: string | null }> {
  try {
    const categories = await categoryService.getRootCategories(gender);
    return { data: categories, error: null };
  } catch (err) {
    logger.error("fetchRootCategories failed", { gender, error: err }, "ServerAction");
    return { data: [], error: "Failed to load categories" };
  }
}

/**
 * Fetch subcategories of a parent category.
 */
export async function fetchChildCategories(
  parentId: string
): Promise<{ data: CategoryDTO[]; error: string | null }> {
  try {
    const children = await categoryService.getChildCategories(parentId);
    return { data: children, error: null };
  } catch (err) {
    logger.error("fetchChildCategories failed", { parentId, error: err }, "ServerAction");
    return { data: [], error: "Failed to load subcategories" };
  }
}

/**
 * Fetch the full category tree for a gender department (for mega menus).
 */
export async function fetchCategoryTree(
  gender?: Gender
): Promise<{ data: CategoryTreeDTO[]; error: string | null }> {
  try {
    const tree = await categoryService.getCategoryTree(gender);
    return { data: tree, error: null };
  } catch (err) {
    logger.error("fetchCategoryTree failed", { gender, error: err }, "ServerAction");
    return { data: [], error: "Failed to load category tree" };
  }
}

/**
 * Fetch a department page (root category + subcategories) for a gender slug.
 */
export async function fetchDepartmentCategories(
  genderSlug: string
): Promise<{
  data: { department: CategoryDTO; subcategories: CategoryDTO[] } | null;
  error: string | null;
}> {
  try {
    const result = await categoryService.getDepartmentCategories(genderSlug);
    return { data: result, error: null };
  } catch (err) {
    logger.error("fetchDepartmentCategories failed", { genderSlug, error: err }, "ServerAction");
    return { data: null, error: "Department not found" };
  }
}

// ---------- Collection Actions ----------

/**
 * Fetch a collection by slug with related categories and breadcrumbs.
 */
export async function fetchCollectionBySlug(
  slug: string
): Promise<{ data: CollectionDetailResult | null; error: string | null }> {
  try {
    const result = await collectionService.getCollectionBySlug(slug);
    return { data: result, error: null };
  } catch (err) {
    logger.error("fetchCollectionBySlug failed", { slug, error: err }, "ServerAction");
    return { data: null, error: "Collection not found" };
  }
}

/**
 * Fetch all active collections for discovery pages.
 */
export async function fetchActiveCollections(options?: {
  onlyCurrentlyActive?: boolean;
  limit?: number;
}): Promise<{ data: CollectionDTO[]; error: string | null }> {
  try {
    const collections = await collectionService.getActiveCollections(options);
    return { data: collections, error: null };
  } catch (err) {
    logger.error("fetchActiveCollections failed", { error: err }, "ServerAction");
    return { data: [], error: "Failed to load collections" };
  }
}

/**
 * Fetch featured collections for homepage/discovery.
 */
export async function fetchFeaturedCollections(
  limit = 6
): Promise<{ data: CollectionDTO[]; error: string | null }> {
  try {
    const collections = await collectionService.getFeaturedCollections(limit);
    return { data: collections, error: null };
  } catch (err) {
    logger.error("fetchFeaturedCollections failed", { error: err }, "ServerAction");
    return { data: [], error: "Failed to load featured collections" };
  }
}
