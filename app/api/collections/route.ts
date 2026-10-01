/**
 * VÉRONA — Collections API Route
 *
 * GET /api/collections — Returns active fashion collections.
 * Supports query parameters:
 *   - limit: Maximum number of collections to return
 *   - active: If 'true', only returns currently date-active collections
 *   - categoryId: Filter by associated category
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/response";
import { collectionService } from "@/modules/catalog/collection.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get("limit");
    const activeParam = searchParams.get("active");
    const categoryId = searchParams.get("categoryId");

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // Filter by category
    if (categoryId) {
      const collections = await collectionService.getCollectionsForCategory(categoryId);
      return apiSuccess(collections);
    }

    // Return active collections
    const collections = await collectionService.getActiveCollections({
      onlyCurrentlyActive: activeParam === "true",
      limit: limit && !isNaN(limit) ? limit : undefined,
    });

    return apiSuccess(collections);
  } catch (error) {
    return apiError(error);
  }
}
