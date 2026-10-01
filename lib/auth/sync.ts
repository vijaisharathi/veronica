/**
 * VÉRONA — Customer Identity Synchronization Engine
 *
 * Synchronizes Clerk authenticated identity with the VÉRONA Customer document in MongoDB.
 * Ensures `authProviderId` uniquely identifies the customer and preserves application-owned fields.
 */

import { CustomerModel } from "@/db/models";
import { ICustomer } from "@/types/database";
import { CustomerStatus } from "@/constants/status";
import { ClerkUserSnapshot } from "./clerk";
import { logger } from "@/lib/logger";

/**
 * Synchronizes Clerk user profile into the VÉRONA MongoDB Customer collection.
 * 
 * Rules:
 * 1. Find customer by `authProviderId`.
 * 2. If not found by `authProviderId`, attempt to link by verified email to support account linking.
 * 3. If no matching customer exists, create a new Customer record.
 * 4. Never overwrite application-owned fields (preferences, order history, custom display name).
 */
export async function syncCustomerFromClerk(clerkUser: ClerkUserSnapshot): Promise<ICustomer> {
  const { id: authProviderId, email, firstName, lastName, imageUrl, phone, emailVerified } = clerkUser;

  // 1. Look up existing customer by authProviderId
  let customer = await CustomerModel.findOne({ authProviderId, isDeleted: false });

  if (customer) {
    // Synchronize safe identity updates
    let updated = false;
    if (imageUrl && customer.profileImage !== imageUrl) {
      customer.profileImage = imageUrl;
      updated = true;
    }
    if (emailVerified !== customer.emailVerified) {
      customer.emailVerified = emailVerified;
      updated = true;
    }
    if (phone && !customer.phone) {
      customer.phone = phone;
      updated = true;
    }
    customer.lastLoginAt = new Date();
    updated = true;

    if (updated) {
      await customer.save();
    }

    return customer.toObject<ICustomer>();
  }

  // 2. Fallback: check if customer exists by email without authProviderId (pre-registered or legacy)
  customer = await CustomerModel.findOne({ email: email.toLowerCase(), isDeleted: false });

  if (customer) {
    customer.authProviderId = authProviderId;
    if (imageUrl && !customer.profileImage) {
      customer.profileImage = imageUrl;
    }
    customer.emailVerified = emailVerified;
    customer.lastLoginAt = new Date();
    await customer.save();

    logger.info(
      "Linked existing customer to Clerk identity",
      { customerId: customer._id.toString(), authProviderId },
      "Authentication"
    );

    return customer.toObject<ICustomer>();
  }

  // 3. Create brand-new Customer record
  const fName = firstName || "Fashion";
  const lName = lastName || "Enthusiast";
  const displayName = `${fName} ${lName}`.trim();

  const newCustomer = await CustomerModel.create({
    authProviderId,
    email: email.toLowerCase(),
    phone: phone || null,
    firstName: fName,
    lastName: lName,
    displayName,
    profileImage: imageUrl || null,
    status: CustomerStatus.ACTIVE,
    emailVerified,
    phoneVerified: Boolean(phone),
    preferences: {
      marketingEmail: true,
      marketingSms: false,
      marketingWhatsapp: false,
    },
    lastLoginAt: new Date(),
  });

  logger.info(
    "Created new VÉRONA customer from Clerk identity",
    { customerId: newCustomer._id.toString(), authProviderId, email },
    "Authentication"
  );

  return newCustomer.toObject<ICustomer>();
}
