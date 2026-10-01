/**
 * VÉRONA — Admin Payment Management Service (Phase 27)
 *
 * Provides safe operational oversight and reconciliation for payment transactions.
 * Exposes non-sensitive transaction data and attempt history without leaking
 * card credentials, secrets, or gateway tokens.
 */

import { connectToDatabase } from "@/db/client";
import {
  PaymentModel,
  PaymentAttemptModel,
  CustomerModel,
} from "@/db/models";
import { IPayment, IPaymentAttempt, ICustomer } from "@/types/database";
import { PaymentStatus } from "@/constants/status";
import { formatMoney } from "@/lib/money";
import { NotFoundError } from "@/lib/errors";
import { paymentService } from "@/modules/payments/services/payment.service";
import { AdminPaymentDetailDTO } from "../types/admin.types";

export interface ListPaymentsOptions {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export class AdminPaymentService {
  /**
   * Retrieves paginated payment transactions with safe operational projections.
   */
  async listPayments(options: ListPaymentsOptions = {}) {
    await connectToDatabase();

    const {
      status,
      search,
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = options;

    const query: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, unknown>).$gte = startDate;
      if (endDate) (query.createdAt as Record<string, unknown>).$lte = endDate;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { providerOrderId: { $regex: term, $options: "i" } },
        { providerPaymentId: { $regex: term, $options: "i" } },
        { checkoutSessionId: { $regex: term, $options: "i" } },
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [items, total] = await Promise.all([
      PaymentModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IPayment[]>(),
      PaymentModel.countDocuments(query),
    ]);

    // Batch load customers for display names
    const customerIds = Array.from(new Set(items.map((p) => p.customerId?.toString()).filter(Boolean)));
    const customers = await CustomerModel.find({ _id: { $in: customerIds } })
      .select("firstName lastName displayName email")
      .lean<ICustomer[]>();

    const customerMap = new Map<string, { name: string; email: string }>();
    for (const c of customers) {
      const name = c.displayName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email;
      customerMap.set(c._id.toString(), { name, email: c.email });
    }

    const safePayments = items.map((p) => {
      const cust = customerMap.get(p.customerId?.toString() || "");
      const amountMinor = p.amount || 0;
      return {
        id: p._id.toString(),
        checkoutSessionId: p.checkoutSessionId?.toString() || "",
        customerId: p.customerId?.toString() || "",
        customerName: cust?.name || "Customer",
        customerEmail: cust?.email || "",
        provider: p.provider,
        providerOrderId: p.providerOrderId,
        providerPaymentId: p.providerPaymentId,
        amountMinor,
        amountFormatted: formatMoney(amountMinor),
        currency: p.currency || "INR",
        status: p.status,
        method: p.method,
        attemptsCount: p.attemptsCount || 1,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
      };
    });

    return {
      payments: safePayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single payment details with full attempt history.
   */
  async getPaymentDetail(paymentId: string): Promise<AdminPaymentDetailDTO> {
    await connectToDatabase();

    const payment = await PaymentModel.findById(paymentId).lean<IPayment>();
    if (!payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    const [attempts, customer] = await Promise.all([
      PaymentAttemptModel.find({ paymentId })
        .sort({ createdAt: -1 })
        .lean<IPaymentAttempt[]>(),
      CustomerModel.findById(payment.customerId)
        .select("firstName lastName displayName email")
        .lean<ICustomer>(),
    ]);

    const customerName = customer
      ? customer.displayName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email
      : undefined;

    const amountMinor = payment.amount || 0;

    return {
      id: payment._id.toString(),
      checkoutSessionId: payment.checkoutSessionId?.toString() || "",
      customerId: payment.customerId?.toString() || "",
      customerName,
      customerEmail: customer?.email,
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      amountMinor,
      amountFormatted: formatMoney(amountMinor),
      currency: payment.currency || "INR",
      status: payment.status,
      method: payment.method,
      attempts: attempts.map((a) => ({
        attemptId: a.attemptId,
        providerOrderId: a.providerOrderId || "",
        providerPaymentId: a.providerPaymentId,
        amountFormatted: formatMoney(a.amount || 0),
        status: a.status,
        failureCode: a.failureCode,
        failureMessage: a.failureMessage,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
      })),
      createdAt: payment.createdAt instanceof Date ? payment.createdAt.toISOString() : String(payment.createdAt),
      updatedAt: payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : String(payment.updatedAt),
    };
  }

  /**
   * Reconciles an active payment record against the payment provider.
   */
  async reconcilePayment(paymentId: string): Promise<AdminPaymentDetailDTO> {
    await connectToDatabase();

    const payment = await PaymentModel.findById(paymentId).lean<IPayment>();
    if (!payment) {
      throw new NotFoundError("Payment", paymentId);
    }

    // Call authoritative PaymentService status resolver with provider reconciliation
    await paymentService.getPaymentStatus(payment.customerId.toString(), paymentId);

    return this.getPaymentDetail(paymentId);
  }
}

export const adminPaymentService = new AdminPaymentService();
