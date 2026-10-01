/**
 * VÉRONA — Checkout Session Database Repository
 *
 * Encapsulates Mongoose database operations for checkout sessions.
 * Enforces customer isolation, session lifecycle transitions, and expiration queries.
 */

import { CheckoutSessionModel } from "@/db/models";
import { CheckoutSessionStatus } from "@/constants/status";
import { ICheckoutSession } from "@/types/database";

export class CheckoutRepository {
  /**
   * Find the currently active, non-expired checkout session for a customer.
   */
  async findActiveByCustomer(customerId: string): Promise<ICheckoutSession | null> {
    return CheckoutSessionModel.findOne({
      customerId,
      status: CheckoutSessionStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    }).lean<ICheckoutSession>();
  }

  /**
   * Find a specific checkout session verifying customer ownership.
   */
  async findByIdAndCustomer(id: string, customerId: string): Promise<ICheckoutSession | null> {
    return CheckoutSessionModel.findOne({
      _id: id,
      customerId,
    }).lean<ICheckoutSession>();
  }

  /**
   * Find checkout session by ID alone (used for existence/IDOR checks).
   */
  async findById(id: string): Promise<ICheckoutSession | null> {
    return CheckoutSessionModel.findById(id).lean<ICheckoutSession>();
  }

  /**
   * Creates a new checkout session.
   */
  async create(data: Partial<ICheckoutSession>): Promise<ICheckoutSession> {
    const created = await CheckoutSessionModel.create(data);
    return created.toObject() as ICheckoutSession;
  }

  /**
   * Updates an existing checkout session strictly scoped to its customer.
   */
  async update(
    id: string,
    customerId: string,
    updates: Partial<ICheckoutSession>
  ): Promise<ICheckoutSession | null> {
    return CheckoutSessionModel.findOneAndUpdate(
      { _id: id, customerId },
      { $set: updates },
      { new: true }
    ).lean<ICheckoutSession>();
  }

  /**
   * Marks previous active sessions for a customer as EXPIRED.
   */
  async expireOtherActiveSessions(customerId: string, excludeId?: string): Promise<void> {
    const filter: Record<string, unknown> = {
      customerId,
      status: CheckoutSessionStatus.ACTIVE,
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    await CheckoutSessionModel.updateMany(filter, {
      $set: { status: CheckoutSessionStatus.EXPIRED },
    });
  }

  /**
   * Marks a session as COMPLETED (prepared for future order/payment completion).
   */
  async markCompleted(id: string, customerId: string): Promise<boolean> {
    const result = await CheckoutSessionModel.updateOne(
      { _id: id, customerId },
      { $set: { status: CheckoutSessionStatus.COMPLETED } }
    );
    return result.modifiedCount > 0;
  }
}

export const checkoutRepository = new CheckoutRepository();
