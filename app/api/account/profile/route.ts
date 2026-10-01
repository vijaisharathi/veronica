import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { CustomerModel } from "@/db/models";
import { apiSuccess, apiError } from "@/lib/response";
import { ValidationError, normalizeError } from "@/lib/errors";

import { ICustomer } from "@/types/database";

export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(100).optional(),
  displayName: z.string().trim().min(1, "Display name is required").max(150).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
});

function toProfileDto(customer: ICustomer) {
  return {
    id: customer._id.toString(),
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName: customer.displayName,
    phone: customer.phone,
    profileImage: customer.profileImage,
    status: customer.status,
    emailVerified: customer.emailVerified,
    phoneVerified: customer.phoneVerified,
    preferences: customer.preferences,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

/**
 * GET /api/account/profile
 * Returns the current authenticated customer's profile.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    return apiSuccess(toProfileDto(customer), {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * PATCH /api/account/profile
 * Updates allowed profile fields with strict allowlisting.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const body = await request.json();

    const parseResult = UpdateProfileSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        "Invalid profile update parameters",
        parseResult.error.flatten().fieldErrors
      );
    }

    const { firstName, lastName, displayName, phone } = parseResult.data;

    // Strict allowlist updates only
    const updateFields: Record<string, string | null> = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (displayName !== undefined) {
      updateFields.displayName = displayName;
    } else if (firstName !== undefined || lastName !== undefined) {
      // Auto-compute display name if first/last changed without explicit displayName
      const newFirst = firstName ?? customer.firstName;
      const newLast = lastName ?? customer.lastName;
      updateFields.displayName = `${newFirst} ${newLast}`.trim();
    }
    if (phone !== undefined) updateFields.phone = phone;

    const updatedCustomer = await CustomerModel.findByIdAndUpdate(
      customer._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedCustomer) {
      throw new ValidationError("Failed to update customer profile");
    }

    return apiSuccess(toProfileDto(updatedCustomer), {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
