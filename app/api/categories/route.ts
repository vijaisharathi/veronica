/**
 * VÉRONA — Categories API Route
 *
 * GET /api/categories — Returns active categories.
 * Supports query parameters:
 *   - gender: Filter by gender (MEN, WOMEN, KIDS, UNISEX)
 *   - parentId: Filter by parent category
 *   - tree: If 'true', returns hierarchical tree structure
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { categoryService } from "@/modules/catalog/category.service";
import { Gender } from "@/constants/status";
import { ValidationError } from "@/lib/errors";

const VALID_GENDERS = new Set(Object.values(Gender));

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const genderParam = searchParams.get("gender")?.toUpperCase();
    const parentId = searchParams.get("parentId");
    const tree = searchParams.get("tree");

    // Validate gender param if provided
    let gender: Gender | undefined;
    if (genderParam) {
      if (!VALID_GENDERS.has(genderParam as Gender)) {
        throw new ValidationError("Invalid gender parameter", {
          validValues: Array.from(VALID_GENDERS),
        });
      }
      gender = genderParam as Gender;
    }

    // Return tree structure
    if (tree === "true") {
      const categoryTree = await categoryService.getCategoryTree(gender);
      return apiSuccess(categoryTree);
    }

    // Return children of a parent
    if (parentId) {
      const children = await categoryService.getChildCategories(parentId);
      return apiSuccess(children);
    }

    // Return root categories
    const categories = await categoryService.getRootCategories(gender);
    return apiSuccess(categories);
  } catch (error) {
    return apiError(error);
  }
}
