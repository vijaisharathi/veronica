/**
 * VÉRONA — Category Domain Service
 *
 * Business logic layer for category browsing in the storefront.
 * Provides typed DTOs suitable for UI consumption, sitting between
 * the repository layer and server actions / route handlers.
 */

import { categoryRepository, CategoryTreeItem } from "@/db/repositories/category.repository";
import { connectToDatabase } from "@/db/client";
import { Gender } from "@/constants/status";
import { ICategory } from "@/types/database";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// ---------- DTOs ----------

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  banner?: string;
  gender: Gender;
  sortOrder: number;
  parentId?: string | null;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface CategoryTreeDTO extends CategoryDTO {
  children: CategoryTreeDTO[];
}

export interface CategoryBrowseResult {
  category: CategoryDTO;
  subcategories: CategoryDTO[];
  breadcrumbs: Array<{ label: string; href?: string }>;
}

// ---------- Mappers ----------

function toCategoryDTO(doc: ICategory): CategoryDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    image: doc.image,
    banner: doc.banner,
    gender: doc.gender,
    sortOrder: doc.sortOrder,
    parentId: doc.parentId?.toString() ?? null,
    seo: doc.seo,
  };
}

function toTreeDTO(node: CategoryTreeItem): CategoryTreeDTO {
  return {
    ...toCategoryDTO(node),
    children: (node.children ?? []).map(toTreeDTO),
  };
}

// ---------- Service ----------

export class CategoryService {
  /**
   * Get a single category by its slug, with its subcategories and breadcrumbs.
   */
  async getCategoryBySlug(slug: string): Promise<CategoryBrowseResult> {
    await connectToDatabase();
    const category = await categoryRepository.findBySlug(slug);

    if (!category || !category.active) {
      throw new NotFoundError("Category", slug);
    }

    const subcategories = await categoryRepository.findSubcategories(category._id.toString());
    const breadcrumbs = await this.buildBreadcrumbs(category);

    return {
      category: toCategoryDTO(category),
      subcategories: subcategories.map(toCategoryDTO),
      breadcrumbs,
    };
  }

  /**
   * Get a single category by its ID
   */
  async getCategoryById(id: string): Promise<CategoryDTO | null> {
    await connectToDatabase();
    const category = await categoryRepository.findById(id);
    if (!category) return null;
    return toCategoryDTO(category);
  }

  /**
   * Get root-level categories for a given gender department.
   */
  async getRootCategories(gender?: Gender): Promise<CategoryDTO[]> {
    await connectToDatabase();
    const categories = await categoryRepository.findRootCategories(gender);
    return categories.map(toCategoryDTO);
  }

  /**
   * Get direct children of a given parent category.
   */
  async getChildCategories(parentId: string): Promise<CategoryDTO[]> {
    await connectToDatabase();
    const children = await categoryRepository.findSubcategories(parentId);
    return children.map(toCategoryDTO);
  }

  /**
   * Build hierarchical category tree for a gender department.
   * Used for mega menus and category navigation.
   */
  async getCategoryTree(gender?: Gender): Promise<CategoryTreeDTO[]> {
    await connectToDatabase();
    const tree = await categoryRepository.getCategoryTree(gender);
    return tree.map(toTreeDTO);
  }

  /**
   * Get categories for a specific gender department page (e.g., /women, /men, /kids).
   * Returns the root category and its subcategories.
   */
  async getDepartmentCategories(genderSlug: string): Promise<{
    department: CategoryDTO;
    subcategories: CategoryDTO[];
  } | null> {
    await connectToDatabase();

    const genderMap: Record<string, Gender> = {
      women: Gender.WOMEN,
      men: Gender.MEN,
      kids: Gender.KIDS,
    };

    const gender = genderMap[genderSlug.toLowerCase()];
    if (!gender) {
      logger.warn("Invalid gender slug requested", { genderSlug }, "CategoryService");
      return null;
    }

    const department = await categoryRepository.findBySlug(genderSlug);
    if (!department || !department.active) {
      return null;
    }

    const subcategories = await categoryRepository.findSubcategories(department._id.toString());

    return {
      department: toCategoryDTO(department),
      subcategories: subcategories.map(toCategoryDTO),
    };
  }

  /**
   * Build breadcrumb trail for a category by walking up the parent chain.
   */
  private async buildBreadcrumbs(
    category: ICategory
  ): Promise<Array<{ label: string; href?: string }>> {
    const crumbs: Array<{ label: string; href?: string }> = [];
    let current: ICategory | null = category;

    // Walk up parent chain
    const visited = new Set<string>();
    while (current?.parentId) {
      const parentIdStr = current.parentId.toString();
      if (visited.has(parentIdStr)) break; // Safety: prevent circular references
      visited.add(parentIdStr);

      const parent = await categoryRepository.findById(parentIdStr);
      if (!parent) break;
      crumbs.unshift({ label: parent.name, href: `/${parent.slug}` });
      current = parent;
    }

    // Add current category as the terminal crumb (no href)
    crumbs.push({ label: category.name });

    return crumbs;
  }
}

export const categoryService = new CategoryService();
