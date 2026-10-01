/**
 * VÉRONA — Payment Domain Repository
 *
 * Encapsulated persistence layer for payments, payment attempts,
 * idempotent webhook event tracking, and audit status history.
 */

import {
  PaymentModel,
  PaymentAttemptModel,
  PaymentWebhookEventModel,
  PaymentStatusHistoryModel,
} from "@/db/models";
import {
  IPayment,
  IPaymentAttempt,
  IPaymentWebhookEvent,
  IPaymentStatusHistory,
} from "@/types/database";
import { connectToDatabase } from "@/db/client";

export class PaymentRepository {
  async findPaymentById(id: string): Promise<IPayment | null> {
    await connectToDatabase();
    return PaymentModel.findById(id).lean<IPayment>();
  }

  async findPaymentByCheckoutSession(checkoutSessionId: string): Promise<IPayment | null> {
    await connectToDatabase();
    return PaymentModel.findOne({ checkoutSessionId }).lean<IPayment>();
  }

  async findPaymentByProviderOrderId(providerOrderId: string): Promise<IPayment | null> {
    await connectToDatabase();
    return PaymentModel.findOne({ providerOrderId }).lean<IPayment>();
  }

  async findPaymentByCustomerAndId(customerId: string, paymentId: string): Promise<IPayment | null> {
    await connectToDatabase();
    return PaymentModel.findOne({ _id: paymentId, customerId }).lean<IPayment>();
  }

  async createPayment(data: Partial<IPayment>): Promise<IPayment> {
    await connectToDatabase();
    const created = await PaymentModel.create(data);
    return created.toObject();
  }

  async updatePayment(id: string, data: Partial<IPayment>): Promise<IPayment | null> {
    await connectToDatabase();
    return PaymentModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<IPayment>();
  }

  async createPaymentAttempt(data: Partial<IPaymentAttempt>): Promise<IPaymentAttempt> {
    await connectToDatabase();
    const created = await PaymentAttemptModel.create(data);
    return created.toObject();
  }

  async updatePaymentAttempt(attemptId: string, data: Partial<IPaymentAttempt>): Promise<IPaymentAttempt | null> {
    await connectToDatabase();
    return PaymentAttemptModel.findOneAndUpdate(
      { attemptId },
      { $set: data },
      { new: true }
    ).lean<IPaymentAttempt>();
  }

  async findAttemptsByPaymentId(paymentId: string): Promise<IPaymentAttempt[]> {
    await connectToDatabase();
    return PaymentAttemptModel.find({ paymentId })
      .sort({ createdAt: -1 })
      .lean<IPaymentAttempt[]>();
  }

  async recordStatusHistory(data: Partial<IPaymentStatusHistory>): Promise<IPaymentStatusHistory> {
    await connectToDatabase();
    const created = await PaymentStatusHistoryModel.create(data);
    return created.toObject();
  }

  async findStatusHistory(paymentId: string): Promise<IPaymentStatusHistory[]> {
    await connectToDatabase();
    return PaymentStatusHistoryModel.find({ paymentId })
      .sort({ timestamp: 1 })
      .lean<IPaymentStatusHistory[]>();
  }

  async findWebhookEvent(provider: string, eventId: string): Promise<IPaymentWebhookEvent | null> {
    await connectToDatabase();
    return PaymentWebhookEventModel.findOne({ provider, eventId }).lean<IPaymentWebhookEvent>();
  }

  async recordWebhookEvent(data: Partial<IPaymentWebhookEvent>): Promise<IPaymentWebhookEvent> {
    await connectToDatabase();
    const created = await PaymentWebhookEventModel.create(data);
    return created.toObject();
  }

  async updateWebhookEvent(id: string, data: Partial<IPaymentWebhookEvent>): Promise<IPaymentWebhookEvent | null> {
    await connectToDatabase();
    return PaymentWebhookEventModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<IPaymentWebhookEvent>();
  }
}

export const paymentRepository = new PaymentRepository();
