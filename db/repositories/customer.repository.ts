import { CustomerModel } from "@/db/models";
import { ICustomer, ICustomerPreferences } from "@/types/database";

export class CustomerRepository {
  /**
   * Find customer by ID
   */
  async findById(id: string): Promise<ICustomer | null> {
    return CustomerModel.findOne({ _id: id, isDeleted: false }).lean<ICustomer>();
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string): Promise<ICustomer | null> {
    return CustomerModel.findOne({ email: email.toLowerCase(), isDeleted: false }).lean<ICustomer>();
  }

  /**
   * Find customer by external authentication provider ID (e.g. Clerk user ID)
   */
  async findByAuthProviderId(authProviderId: string): Promise<ICustomer | null> {
    return CustomerModel.findOne({ authProviderId, isDeleted: false }).lean<ICustomer>();
  }

  /**
   * Find customer by phone number
   */
  async findByPhone(phone: string): Promise<ICustomer | null> {
    return CustomerModel.findOne({ phone, isDeleted: false }).lean<ICustomer>();
  }

  /**
   * Update customer communication preferences
   */
  async updatePreferences(
    customerId: string,
    preferences: Partial<ICustomerPreferences>
  ): Promise<boolean> {
    const updateObj: Record<string, boolean> = {};
    if (preferences.marketingEmail !== undefined) {
      updateObj["preferences.marketingEmail"] = preferences.marketingEmail;
    }
    if (preferences.marketingSms !== undefined) {
      updateObj["preferences.marketingSms"] = preferences.marketingSms;
    }
    if (preferences.marketingWhatsapp !== undefined) {
      updateObj["preferences.marketingWhatsapp"] = preferences.marketingWhatsapp;
    }

    const result = await CustomerModel.updateOne(
      { _id: customerId, isDeleted: false },
      { $set: updateObj }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Soft delete a customer profile
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await CustomerModel.updateOne(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }
}

export const customerRepository = new CustomerRepository();
