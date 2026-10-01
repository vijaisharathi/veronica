/**
 * VÉRONA — Admin Review Detail API Route
 *
 * GET /api/admin/reviews/[id] — Retrieve detailed operational review data.
 */

import { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError, NotFoundError } from "@/lib/errors";
import { ReviewModel, ReviewReportModel, ProductModel, CustomerModel, OrderModel } from "@/db/models";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAnyPermission([
      PERMISSIONS.REVIEWS_READ,
      PERMISSIONS.REVIEWS_MODERATE,
      PERMISSIONS.REVIEWS_MANAGE,
    ]);

    const { id } = await context.params;
    const review = await ReviewModel.findById(id).lean();
    if (!review) {
      throw new NotFoundError("Review", id);
    }

    const [product, customer, reports, order] = await Promise.all([
      ProductModel.findById(review.productId).select("name slug").lean(),
      CustomerModel.findById(review.customerId).select("firstName lastName email").lean(),
      ReviewReportModel.find({ reviewId: id }).sort({ createdAt: -1 }).lean(),
      review.orderId ? OrderModel.findById(review.orderId).select("orderNumber status").lean() : null,
    ]);

    const adminDto = {
      ...review,
      productName: product?.name,
      productSlug: product?.slug,
      customerEmail: customer?.email,
      customerFullName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : review.customerDisplayName,
      orderNumber: order?.orderNumber,
      orderStatus: order?.status,
      reports,
    };

    return apiSuccess(adminDto, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
