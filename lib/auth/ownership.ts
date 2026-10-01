/**
 * VÉRONA — Resource Ownership & IDOR Protection
 *
 * Enforces strict self-access boundaries for customer-owned resources
 * (orders, addresses, wishlist items, cart items, reviews).
 */

import { ICustomer } from "@/types/database";
import { ResourceAccessDeniedError } from "@/lib/errors";
import { requireCustomer } from "./session";

/**
 * Validates that an authenticated customer ID matches the resource's owner ID.
 * Throws ResourceAccessDeniedError (403) on mismatch to prevent IDOR attacks.
 */
export function verifyResourceOwnership(
  authenticatedCustomerId: string,
  resourceOwnerId: string | { toString(): string }
): void {
  const ownerStr = typeof resourceOwnerId === "string" ? resourceOwnerId : resourceOwnerId.toString();
  if (authenticatedCustomerId !== ownerStr) {
    throw new ResourceAccessDeniedError("Access to the requested resource is denied");
  }
}

/**
 * Server guard: Resolves the current customer and validates that they own the requested resource.
 */
export async function requireCustomerOwnership(
  resourceOwnerId: string | { toString(): string }
): Promise<ICustomer> {
  const customer = await requireCustomer();
  verifyResourceOwnership(customer._id.toString(), resourceOwnerId);
  return customer;
}
