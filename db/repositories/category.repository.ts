import { CategoryModel } from "@/db/models";
import { ICategory } from "@/types/database";
import { Gender } from "@/constants/status";

export interface CategoryTreeItem extends ICategory {
  children?: CategoryTreeItem[];
}

export class CategoryRepository {
  /**
   * Find category by unique slug
   */
  async findBySlug(slug: string): Promise<ICategory | null> {
    return CategoryModel.findOne({ slug: slug.toLowerCase(), isDeleted: false }).lean<ICategory>();
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<ICategory | null> {
    return CategoryModel.findOne({ _id: id, isDeleted: false }).lean<ICategory>();
  }

  /**
   * Fetch root categories (parentId = null)
   */
  async findRootCategories(gender?: Gender): Promise<ICategory[]> {
    const query: Record<string, unknown> = {
      parentId: null,
      active: true,
      isDeleted: false,
    };
    if (gender) {
      query.gender = gender;
    }
    return CategoryModel.find(query).sort({ sortOrder: 1 }).lean<ICategory[]>();
  }

  /**
   * Fetch subcategories by parent category ID
   */
  async findSubcategories(parentId: string): Promise<ICategory[]> {
    return CategoryModel.find({
      parentId,
      active: true,
      isDeleted: false,
    })
      .sort({ sortOrder: 1 })
      .lean<ICategory[]>();
  }

  /**
   * Build hierarchical category tree
   */
  async getCategoryTree(gender?: Gender): Promise<CategoryTreeItem[]> {
    const query: Record<string, unknown> = {
      active: true,
      isDeleted: false,
    };
    if (gender) {
      query.gender = gender;
    }

    const allCategories = await CategoryModel.find(query).sort({ sortOrder: 1 }).lean<ICategory[]>();

    const categoryMap = new Map<string, CategoryTreeItem>();
    const roots: CategoryTreeItem[] = [];

    for (const cat of allCategories) {
      categoryMap.set(cat._id.toString(), { ...cat, children: [] });
    }

    for (const cat of allCategories) {
      const current = categoryMap.get(cat._id.toString())!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId.toString());
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(current);
        } else {
          roots.push(current);
        }
      } else {
        roots.push(current);
      }
    }

    return roots;
  }

  /**
   * Soft delete category
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await CategoryModel.updateOne(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }
}

export const categoryRepository = new CategoryRepository();
