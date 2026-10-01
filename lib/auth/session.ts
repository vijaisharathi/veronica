/**
 * VÉRONA — Server-Side Authentication & Session Resolution Helpers
 *
 * Provides trusted helpers to derive current user, customer, and staff identities.
 * Enforces account status restrictions and prevents client identity spoofing.
 */

import { CustomerModel, StaffModel } from "@/db/models";
import { ICustomer, IStaff } from "@/types/database";
import { CustomerStatus, StaffStatus } from "@/constants/status";
import {
  AuthenticationError,
  AccountSuspendedError,
  AuthorizationError,
} from "@/lib/errors";
import { getClerkSession, getClerkUser, ClerkAuthIdentity } from "./clerk";
import { syncCustomerFromClerk } from "./sync";

/**
 * Returns current authenticated Clerk identity or null.
 */
export async function getCurrentAuthUser(): Promise<ClerkAuthIdentity | null> {
  return getClerkSession();
}

/**
 * Asserts that the request is authenticated. Throws AuthenticationError if not.
 */
export async function requireAuthenticatedUser(): Promise<ClerkAuthIdentity> {
  const session = await getClerkSession();
  if (!session) {
    throw new AuthenticationError("Authentication required to access this resource");
  }
  return session;
}

/**
 * Resolves current VÉRONA Customer from the authenticated Clerk session.
 * Automatically triggers customer profile synchronization if needed.
 * Returns null if unauthenticated.
 */
export async function getCurrentCustomer(): Promise<ICustomer | null> {
  const authIdentity = await getClerkSession();
  if (!authIdentity) {
    return null;
  }

  // Look up customer by authProviderId
  let customer = await CustomerModel.findOne({
    authProviderId: authIdentity.userId,
    isDeleted: false,
  }).lean<ICustomer>();

  if (!customer) {
    // If not found, fetch Clerk user details and synchronize
    const clerkUser = await getClerkUser();
    if (clerkUser) {
      customer = await syncCustomerFromClerk(clerkUser);
    }
  }

  if (customer && customer.status === CustomerStatus.SUSPENDED) {
    throw new AccountSuspendedError("Your customer account has been suspended");
  }

  return customer;
}

/**
 * Asserts that the current request belongs to an active VÉRONA Customer.
 * Throws AuthenticationError or AccountSuspendedError if not.
 */
export async function requireCustomer(): Promise<ICustomer> {
  const customer = await getCurrentCustomer();
  if (!customer) {
    throw new AuthenticationError("Customer authentication required");
  }
  return customer;
}

/**
 * Resolves internal staff member record if the authenticated Clerk identity is an operator.
 * Returns null if the user is a customer or unauthenticated.
 */
export async function getCurrentStaff(): Promise<IStaff | null> {
  const authIdentity = await getClerkSession();
  if (!authIdentity) {
    return null;
  }

  const staff = await StaffModel.findOne({
    authProviderId: authIdentity.userId,
    isDeleted: false,
    status: StaffStatus.ACTIVE,
  })
    .populate("roles")
    .lean<IStaff>();

  return staff;
}

/**
 * Asserts that the current request belongs to an active internal Staff member.
 * Throws AuthenticationError if unauthenticated, or AuthorizationError (403) if not staff.
 */
export async function requireStaff(): Promise<IStaff> {
  await requireAuthenticatedUser();
  const staff = await getCurrentStaff();

  if (!staff) {
    throw new AuthorizationError("Access denied: Staff privileges required", "STAFF_ONLY");
  }

  return staff;
}
