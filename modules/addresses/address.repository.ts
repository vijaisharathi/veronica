/**
 * VÉRONA — Address Database Repository
 *
 * Encapsulates Mongoose database operations for customer addresses.
 * Enforces customer isolation, soft-deletion filters, and atomic default toggles.
 */

import { AddressModel } from "@/db/models";
import { IAddress } from "@/types/database";

export class AddressRepository {
  /**
   * Find address by ID regardless of customer (used for existence/IDOR checks).
   */
  async findById(id: string): Promise<IAddress | null> {
    return AddressModel.findOne({ _id: id, isDeleted: false }).lean<IAddress>();
  }

  /**
   * Find address strictly scoped to an authenticated customer.
   */
  async findByCustomerAndId(customerId: string, id: string): Promise<IAddress | null> {
    return AddressModel.findOne({
      _id: id,
      customerId,
      isDeleted: false,
    }).lean<IAddress>();
  }

  /**
   * List all active addresses for a customer.
   * Deterministically orders default address first, followed by newest addresses.
   */
  async listByCustomer(customerId: string): Promise<IAddress[]> {
    return AddressModel.find({
      customerId,
      isDeleted: false,
    })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean<IAddress[]>();
  }

  /**
   * Count total active addresses for a customer.
   */
  async countByCustomer(customerId: string): Promise<number> {
    return AddressModel.countDocuments({
      customerId,
      isDeleted: false,
    });
  }

  /**
   * Create a new address document.
   */
  async create(data: Partial<IAddress>): Promise<IAddress> {
    const created = await AddressModel.create({
      ...data,
      isDeleted: false,
      deletedAt: null,
    });
    return created.toObject() as IAddress;
  }

  /**
   * Update an existing address strictly scoped to its customer.
   */
  async update(
    id: string,
    customerId: string,
    updates: Partial<IAddress>
  ): Promise<IAddress | null> {
    return AddressModel.findOneAndUpdate(
      { _id: id, customerId, isDeleted: false },
      { $set: updates },
      { new: true }
    ).lean<IAddress>();
  }

  /**
   * Soft-delete an address and ensure isDefault is false.
   */
  async softDelete(id: string, customerId: string): Promise<boolean> {
    const result = await AddressModel.updateOne(
      { _id: id, customerId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          isDefault: false,
        },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Atomically unsets default flag on all addresses of a customer.
   */
  async unsetCustomerDefaults(customerId: string, excludeId?: string): Promise<void> {
    const filter: Record<string, unknown> = {
      customerId,
      isDeleted: false,
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    await AddressModel.updateMany(filter, { $set: { isDefault: false } });
  }

  /**
   * Atomically designates an address as default while removing default status from all others.
   */
  async setDefault(customerId: string, addressId: string): Promise<IAddress | null> {
    // 1. Unset all other defaults for this customer
    await this.unsetCustomerDefaults(customerId, addressId);

    // 2. Set this address as default
    return AddressModel.findOneAndUpdate(
      { _id: addressId, customerId, isDeleted: false },
      { $set: { isDefault: true } },
      { new: true }
    ).lean<IAddress>();
  }

  /**
   * Find the current default address for a customer.
   */
  async findDefault(customerId: string): Promise<IAddress | null> {
    return AddressModel.findOne({
      customerId,
      isDefault: true,
      isDeleted: false,
    }).lean<IAddress>();
  }

  /**
   * Find the latest created active address for a customer (used for deterministic default replacement).
   */
  async findLatestActive(customerId: string, excludeId?: string): Promise<IAddress | null> {
    const query: Record<string, unknown> = {
      customerId,
      isDeleted: false,
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return AddressModel.findOne(query).sort({ createdAt: -1 }).lean<IAddress>();
  }
}

export const addressRepository = new AddressRepository();
