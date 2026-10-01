/**
 * VÉRONA — Address Domain Service
 *
 * Central business logic for customer addresses:
 * - Strict customer ownership enforcement (derived exclusively from authenticated session)
 * - Automatic initial default assignment
 * - Atomic default transitions (exactly one default address when count >= 1)
 * - Deterministic replacement upon default address deletion
 * - Input validation & Indian postal normalization
 */

import { AddressRepository, addressRepository } from "./address.repository";
import {
  AddressDTO,
  CreateAddressInput,
  UpdateAddressInput,
  CheckoutAddressReference,
} from "./address.types";
import {
  CreateAddressSchema,
  UpdateAddressSchema,
  AddressIdParamSchema,
} from "./address.validation";
import { IAddress } from "@/types/database";
import {
  AddressNotFoundError,
  AddressNotOwnedError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";

export class AddressService {
  constructor(private readonly repo: AddressRepository = addressRepository) {}

  /**
   * Converts a database address document into a clean, safe AddressDTO.
   */
  public toDTO(address: IAddress): AddressDTO {
    return {
      id: address._id.toString(),
      customerId: address.customerId.toString(),
      type: address.type,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || undefined,
      landmark: address.landmark || undefined,
      city: address.city,
      state: address.state,
      postalCode: address.pincode,
      country: address.country,
      isDefault: address.isDefault,
      createdAt: address.createdAt instanceof Date ? address.createdAt.toISOString() : String(address.createdAt),
      updatedAt: address.updatedAt instanceof Date ? address.updatedAt.toISOString() : String(address.updatedAt),
    };
  }

  /**
   * Generates a standardized checkout address reference contract for Phase 17.
   */
  public toCheckoutReference(address: IAddress): CheckoutAddressReference {
    const lines = [
      address.addressLine1,
      address.addressLine2,
      address.landmark ? `Near ${address.landmark}` : null,
      `${address.city}, ${address.state} - ${address.pincode}`,
      address.country,
    ].filter(Boolean);

    return {
      addressId: address._id.toString(),
      fullName: address.fullName,
      phone: address.phone,
      formattedAddress: lines.join(", "),
      city: address.city,
      state: address.state,
      postalCode: address.pincode,
      country: address.country,
      type: address.type,
      isDefault: address.isDefault,
    };
  }

  /**
   * Retrieves all saved addresses for an authenticated customer.
   */
  async listAddresses(customerId: string): Promise<AddressDTO[]> {
    if (!customerId) {
      throw new ValidationError("Customer identification required");
    }
    const addresses = await this.repo.listByCustomer(customerId);
    return addresses.map((addr) => this.toDTO(addr));
  }

  /**
   * Retrieves a single address verifying customer ownership.
   */
  async getAddress(customerId: string, addressId: string): Promise<AddressDTO> {
    const parsedId = AddressIdParamSchema.safeParse({ id: addressId });
    if (!parsedId.success) {
      throw new ValidationError("Invalid address identifier format");
    }

    const address = await this.repo.findById(addressId);
    if (!address) {
      throw new AddressNotFoundError(addressId);
    }

    if (address.customerId.toString() !== customerId) {
      throw new AddressNotOwnedError();
    }

    return this.toDTO(address);
  }

  /**
   * Creates a new address for the authenticated customer.
   *
   * Business Rules:
   * 1. If customer has zero existing addresses, this first address automatically becomes default.
   * 2. If isDefault is explicitly requested, all other addresses for this customer are atomically unset.
   */
  async createAddress(customerId: string, rawInput: CreateAddressInput): Promise<AddressDTO> {
    if (!customerId) {
      throw new ValidationError("Customer identification required");
    }

    const validation = CreateAddressSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Invalid address parameters";
      throw new ValidationError(firstIssue, validation.error.flatten());
    }

    const data = validation.data;
    const existingCount = await this.repo.countByCustomer(customerId);

    // If first address, force default. Otherwise honour request.
    const shouldBeDefault = existingCount === 0 || !!data.isDefault;

    if (shouldBeDefault && existingCount > 0) {
      await this.repo.unsetCustomerDefaults(customerId);
    }

    const created = await this.repo.create({
      customerId,
      type: data.type,
      fullName: data.fullName,
      phone: data.phone,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      landmark: data.landmark,
      city: data.city,
      state: data.state,
      country: data.country,
      pincode: data.postalCode,
      isDefault: shouldBeDefault,
    });

    logger.info("Created customer address", {
      context: "AddressService",
      metadata: { customerId, addressId: created._id.toString(), isDefault: shouldBeDefault },
    });

    return this.toDTO(created);
  }

  /**
   * Updates an existing address verifying customer ownership.
   *
   * Business Rules:
   * 1. Customer cannot update another customer's address (IDOR protection).
   * 2. If isDefault is updated to true, unsets all other defaults.
   * 3. If pincode changes, delivery serviceability will be affected.
   */
  async updateAddress(
    customerId: string,
    addressId: string,
    rawInput: UpdateAddressInput
  ): Promise<AddressDTO> {
    const parsedId = AddressIdParamSchema.safeParse({ id: addressId });
    if (!parsedId.success) {
      throw new ValidationError("Invalid address identifier format");
    }

    const existing = await this.repo.findById(addressId);
    if (!existing) {
      throw new AddressNotFoundError(addressId);
    }

    if (existing.customerId.toString() !== customerId) {
      throw new AddressNotOwnedError();
    }

    const validation = UpdateAddressSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Invalid address parameters";
      throw new ValidationError(firstIssue, validation.error.flatten());
    }

    const updates = validation.data;
    const dbUpdates: Partial<IAddress> = {};

    if (updates.fullName !== undefined) dbUpdates.fullName = updates.fullName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.addressLine1 !== undefined) dbUpdates.addressLine1 = updates.addressLine1;
    if (updates.addressLine2 !== undefined) dbUpdates.addressLine2 = updates.addressLine2;
    if (updates.landmark !== undefined) dbUpdates.landmark = updates.landmark;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.postalCode !== undefined) dbUpdates.pincode = updates.postalCode;
    if (updates.type !== undefined) dbUpdates.type = updates.type;

    if (updates.isDefault === true) {
      await this.repo.unsetCustomerDefaults(customerId, addressId);
      dbUpdates.isDefault = true;
    }

    const updated = await this.repo.update(addressId, customerId, dbUpdates);
    if (!updated) {
      throw new AddressNotFoundError(addressId);
    }

    logger.info("Updated customer address", {
      context: "AddressService",
      metadata: { customerId, addressId },
    });

    return this.toDTO(updated);
  }

  /**
   * Sets an existing address as the active default address.
   */
  async setDefaultAddress(customerId: string, addressId: string): Promise<AddressDTO> {
    const parsedId = AddressIdParamSchema.safeParse({ id: addressId });
    if (!parsedId.success) {
      throw new ValidationError("Invalid address identifier format");
    }

    const existing = await this.repo.findById(addressId);
    if (!existing) {
      throw new AddressNotFoundError(addressId);
    }

    if (existing.customerId.toString() !== customerId) {
      throw new AddressNotOwnedError();
    }

    const updated = await this.repo.setDefault(customerId, addressId);
    if (!updated) {
      throw new AddressNotFoundError(addressId);
    }

    logger.info("Set default customer address", {
      context: "AddressService",
      metadata: { customerId, addressId },
    });

    return this.toDTO(updated);
  }

  /**
   * Soft-deletes a customer address.
   *
   * Deterministic Replacement Strategy:
   * If the deleted address was the customer's default address:
   * 1. Query the latest created active address belonging to this customer.
   * 2. If one exists, promote it to default.
   * 3. If none exist, the customer now has zero addresses.
   */
  async deleteAddress(
    customerId: string,
    addressId: string
  ): Promise<{ deleted: boolean; newDefaultAddressId?: string }> {
    const parsedId = AddressIdParamSchema.safeParse({ id: addressId });
    if (!parsedId.success) {
      throw new ValidationError("Invalid address identifier format");
    }

    const existing = await this.repo.findById(addressId);
    if (!existing) {
      throw new AddressNotFoundError(addressId);
    }

    if (existing.customerId.toString() !== customerId) {
      throw new AddressNotOwnedError();
    }

    const wasDefault = existing.isDefault;
    await this.repo.softDelete(addressId, customerId);

    let newDefaultAddressId: string | undefined = undefined;

    if (wasDefault) {
      // Find latest active address as deterministic replacement
      const replacement = await this.repo.findLatestActive(customerId, addressId);
      if (replacement) {
        await this.repo.setDefault(customerId, replacement._id.toString());
        newDefaultAddressId = replacement._id.toString();
        logger.info("Promoted replacement default address", {
          context: "AddressService",
          metadata: { customerId, newDefaultAddressId },
        });
      }
    }

    logger.info("Deleted customer address", {
      context: "AddressService",
      metadata: { customerId, addressId, wasDefault, newDefaultAddressId },
    });

    return {
      deleted: true,
      newDefaultAddressId,
    };
  }
}

export const addressService = new AddressService();
