/**
 * VÉRONA — Admin Customer Administration Service (Phase 29)
 *
 * Provides administrative lookup, lifecycle status management, operational context
 * (orders, returns, refunds, reviews, support, notifications), and audited actions.
 * Strictly adheres to Phase 4 authentication and Phase 5 authorization boundaries.
 */

import mongoose from "mongoose";
import {
  CustomerModel,
  OrderModel,
  ReturnRequestModel,
  RefundModel,
  ReviewModel,
  SupportTicketModel,
  AddressModel,
} from "@/db/models";
import { CustomerStatus, ReviewStatus, SupportTicketStatus } from "@/constants/status";
import { IStaff, ICustomer, IAddress } from "@/types/database";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { logAuditTrail } from "@/lib/audit";
import {
  AdminCustomerListQuery,
  AdminCustomerStatusUpdateInput,
  AdminCustomerExportQuery,
} from "../validators/admin-customer.validation";
import {
  AdminCustomerListItemDTO,
  AdminCustomerDetailDTO,
  AdminCustomerAddressDTO,
  AdminCustomerActivityDTO,
} from "../types/admin-management.types";

export class AdminCustomerService {
  /**
   * Lists customers with server-side pagination, search, status filtering, and order aggregates.
   */
  async listCustomers(query: AdminCustomerListQuery): Promise<{
    data: AdminCustomerListItemDTO[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      isDeleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.emailVerified !== undefined) {
      filter.emailVerified = query.emailVerified;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.createdAt = dateFilter;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const orConditions: Array<Record<string, unknown>> = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { displayName: searchRegex },
        { phone: searchRegex },
      ];

      if (mongoose.Types.ObjectId.isValid(query.search.trim())) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(query.search.trim()) });
      }

      filter.$or = orConditions;
    }

    const sortField = query.sortBy || "createdAt";
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [total, rawCustomers] = await Promise.all([
      CustomerModel.countDocuments(filter),
      CustomerModel.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean<ICustomer[]>(),
    ]);

    if (rawCustomers.length === 0) {
      return {
        data: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // Aggregate order metrics for listed customers to prevent N+1 queries
    const customerIds = rawCustomers.map((c) => c._id);
    const orderAggregates = await OrderModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      orderCount: number;
      totalSpendMinor: number;
    }>([
      { $match: { customerId: { $in: customerIds } } },
      {
        $group: {
          _id: "$customerId",
          orderCount: { $sum: 1 },
          totalSpendMinor: { $sum: { $ifNull: ["$pricing.total", 0] } },
        },
      },
    ]);

    const aggregateMap = new Map<string, { orderCount: number; totalSpendMinor: number }>();
    for (const agg of orderAggregates) {
      aggregateMap.set(agg._id.toString(), {
        orderCount: agg.orderCount,
        totalSpendMinor: agg.totalSpendMinor,
      });
    }

    const data: AdminCustomerListItemDTO[] = rawCustomers.map((c) => {
      const idStr = c._id.toString();
      const stats = aggregateMap.get(idStr) || { orderCount: 0, totalSpendMinor: 0 };
      return {
        id: idStr,
        email: c.email,
        phone: c.phone || null,
        firstName: c.firstName,
        lastName: c.lastName,
        displayName: c.displayName,
        status: c.status,
        emailVerified: Boolean(c.emailVerified),
        phoneVerified: Boolean(c.phoneVerified),
        orderCount: stats.orderCount,
        totalSpendMinor: stats.totalSpendMinor,
        lastLoginAt: c.lastLoginAt ? new Date(c.lastLoginAt) : null,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves comprehensive operational context for a customer.
   */
  async getCustomerDetail(id: string, _staff: IStaff): Promise<AdminCustomerDetailDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid customer ID format");
    }

    const customer = await CustomerModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    }).lean<ICustomer>();

    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    const customerObjectId = new mongoose.Types.ObjectId(id);

    // Parallel fetch of customer operational domains
    const [
      addresses,
      orders,
      returns,
      refunds,
      reviews,
      tickets,
    ] = await Promise.all([
      AddressModel.find({ customerId: customerObjectId, isDeleted: false })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean<IAddress[]>(),
      OrderModel.find({ customerId: customerObjectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      ReturnRequestModel.find({ customerId: customerObjectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      RefundModel.find({ customerId: customerObjectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      ReviewModel.find({ customerId: customerObjectId })
        .sort({ createdAt: -1 })
        .lean(),
      SupportTicketModel.find({ customerId: customerObjectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    // Format address list
    const addressDTOs: AdminCustomerAddressDTO[] = addresses.map((addr) => ({
      id: addr._id.toString(),
      type: addr.type,
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || null,
      landmark: addr.landmark || null,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      pincode: addr.pincode,
      isDefault: Boolean(addr.isDefault),
    }));

    // Order metrics
    const totalOrders = orders.length;
    let totalSpendMinor = 0;
    for (const order of orders) {
      totalSpendMinor += Number(order.pricing?.total || 0);
    }
    const recentOrders = orders.slice(0, 5).map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      finalPriceMinor: Number(o.pricing?.total || 0),
      createdAt: new Date(o.createdAt),
    }));

    // Return metrics
    const totalReturns = returns.length;
    const recentReturns = returns.slice(0, 5).map((r) => ({
      id: r._id.toString(),
      returnNumber: r.returnNumber,
      status: r.status,
      returnType: r.type,
      createdAt: new Date(r.createdAt),
    }));

    // Refund metrics
    const totalRefunds = refunds.length;
    let totalRefundedMinor = 0;
    for (const ref of refunds) {
      totalRefundedMinor += Number(ref.amount || 0);
    }
    const recentRefunds = refunds.slice(0, 5).map((ref) => ({
      id: ref._id.toString(),
      refundNumber: ref.refundNumber,
      status: ref.status,
      amountMinor: Number(ref.amount || 0),
      createdAt: new Date(ref.createdAt),
    }));

    // Review metrics
    const totalReviews = reviews.length;
    let publishedReviews = 0;
    let pendingReviews = 0;
    let rejectedReviews = 0;
    let ratingSum = 0;

    for (const rev of reviews) {
      ratingSum += Number(rev.rating || 0);
      if (rev.status === ReviewStatus.PUBLISHED) publishedReviews++;
      else if (rev.status === ReviewStatus.PENDING) pendingReviews++;
      else if (rev.status === ReviewStatus.REJECTED || rev.status === ReviewStatus.HIDDEN) rejectedReviews++;
    }
    const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

    // Support metrics
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(
      (t) => t.status === SupportTicketStatus.OPEN || t.status === SupportTicketStatus.IN_PROGRESS
    ).length;
    const recentTickets = tickets.slice(0, 5).map((t) => ({
      id: t._id.toString(),
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      createdAt: new Date(t.createdAt),
    }));

    // Unified Activity Timeline
    const activityTimeline: AdminCustomerActivityDTO[] = [
      {
        id: `account-created-${customer._id}`,
        type: "ACCOUNT_CREATED",
        title: "Account Created",
        description: `Customer account was registered with email ${customer.email}`,
        timestamp: new Date(customer.createdAt),
      },
    ];

    for (const order of orders.slice(0, 10)) {
      activityTimeline.push({
        id: `order-${order._id}`,
        type: "ORDER_PLACED",
        title: `Order Placed (${order.orderNumber})`,
        description: `Order total ₹${(Number(order.pricing?.total || 0) / 100).toFixed(2)} - Status: ${order.status}`,
        timestamp: new Date(order.createdAt),
        metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
      });
    }

    for (const ret of returns.slice(0, 5)) {
      activityTimeline.push({
        id: `return-${ret._id}`,
        type: "RETURN_REQUESTED",
        title: `Return Requested (${ret.returnNumber})`,
        description: `Return for reason: ${ret.reason} - Status: ${ret.status}`,
        timestamp: new Date(ret.createdAt),
        metadata: { returnId: ret._id.toString() },
      });
    }

    for (const ticket of tickets.slice(0, 5)) {
      activityTimeline.push({
        id: `support-${ticket._id}`,
        type: "TICKET_CREATED",
        title: `Support Ticket (${ticket.ticketNumber})`,
        description: `Subject: ${ticket.subject} - Priority: ${ticket.priority}`,
        timestamp: new Date(ticket.createdAt),
        metadata: { ticketId: ticket._id.toString() },
      });
    }

    activityTimeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      id: customer._id.toString(),
      authProviderId: customer.authProviderId || null,
      email: customer.email,
      phone: customer.phone || null,
      firstName: customer.firstName,
      lastName: customer.lastName,
      displayName: customer.displayName,
      profileImage: customer.profileImage || null,
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : null,
      gender: customer.gender || null,
      status: customer.status,
      emailVerified: Boolean(customer.emailVerified),
      phoneVerified: Boolean(customer.phoneVerified),
      preferences: {
        marketingEmail: Boolean(customer.preferences?.marketingEmail),
        marketingSms: Boolean(customer.preferences?.marketingSms),
        marketingWhatsapp: Boolean(customer.preferences?.marketingWhatsapp),
      },
      createdAt: new Date(customer.createdAt),
      updatedAt: new Date(customer.updatedAt),
      lastLoginAt: customer.lastLoginAt ? new Date(customer.lastLoginAt) : null,
      addresses: addressDTOs,
      orderSummary: {
        totalOrders,
        totalSpendMinor,
        recentOrders,
      },
      returnSummary: {
        totalReturns,
        recentReturns,
      },
      refundSummary: {
        totalRefunds,
        totalRefundedMinor,
        recentRefunds,
      },
      reviewSummary: {
        totalReviews,
        publishedReviews,
        pendingReviews,
        rejectedReviews,
        averageRating,
      },
      supportSummary: {
        openTickets,
        totalTickets,
        recentTickets,
      },
      notificationSummary: {
        preferences: {
          marketingEmail: Boolean(customer.preferences?.marketingEmail),
          marketingSms: Boolean(customer.preferences?.marketingSms),
          marketingWhatsapp: Boolean(customer.preferences?.marketingWhatsapp),
        },
        recentNotificationsCount: 0,
      },
      activityTimeline,
    };
  }

  /**
   * Updates customer status atomically (suspend / restore) and records an immutable audit record.
   */
  async updateCustomerStatus(
    id: string,
    input: AdminCustomerStatusUpdateInput,
    staff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminCustomerListItemDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid customer ID format");
    }

    const customer = await CustomerModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    });

    if (!customer) {
      throw new NotFoundError(`Customer with ID '${id}' not found`);
    }

    const previousStatus = customer.status;

    if (previousStatus === input.status) {
      // Idempotent return
      return {
        id: customer._id.toString(),
        email: customer.email,
        phone: customer.phone || null,
        firstName: customer.firstName,
        lastName: customer.lastName,
        displayName: customer.displayName,
        status: customer.status,
        emailVerified: Boolean(customer.emailVerified),
        phoneVerified: Boolean(customer.phoneVerified),
        orderCount: 0,
        totalSpendMinor: 0,
        lastLoginAt: customer.lastLoginAt ? new Date(customer.lastLoginAt) : null,
        createdAt: new Date(customer.createdAt),
        updatedAt: new Date(customer.updatedAt),
      };
    }

    customer.status = input.status;
    await customer.save();

    const action = input.status === CustomerStatus.SUSPENDED ? "customer.suspended" : "customer.restored";

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action,
      entityType: "Customer",
      entityId: id,
      before: { status: previousStatus },
      after: { status: input.status },
      metadata: { reason: input.reason || null },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return {
      id: customer._id.toString(),
      email: customer.email,
      phone: customer.phone || null,
      firstName: customer.firstName,
      lastName: customer.lastName,
      displayName: customer.displayName,
      status: customer.status,
      emailVerified: Boolean(customer.emailVerified),
      phoneVerified: Boolean(customer.phoneVerified),
      orderCount: 0,
      totalSpendMinor: 0,
      lastLoginAt: customer.lastLoginAt ? new Date(customer.lastLoginAt) : null,
      createdAt: new Date(customer.createdAt),
      updatedAt: new Date(customer.updatedAt),
    };
  }

  /**
   * Fetches customer addresses safely scoped to customerId to prevent IDOR.
   */
  async getCustomerAddresses(id: string): Promise<AdminCustomerAddressDTO[]> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid customer ID format");
    }

    const addresses = await AddressModel.find({
      customerId: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean<IAddress[]>();

    return addresses.map((addr) => ({
      id: addr._id.toString(),
      type: addr.type,
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || null,
      landmark: addr.landmark || null,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      pincode: addr.pincode,
      isDefault: Boolean(addr.isDefault),
    }));
  }

  /**
   * Exports sanitized customer records with an audit trail.
   */
  async exportCustomers(
    query: AdminCustomerExportQuery,
    staff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<Array<Record<string, unknown>>> {
    const filter: Record<string, unknown> = { isDeleted: false };
    if (query.status) filter.status = query.status;
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.createdAt = dateFilter;
    }

    const customers = await CustomerModel.find(filter)
      .limit(1000)
      .sort({ createdAt: -1 })
      .lean<ICustomer[]>();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "customers.exported",
      entityType: "Customer",
      entityId: "bulk",
      metadata: {
        count: customers.length,
        format: query.format,
        status: query.status,
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return customers.map((c) => ({
      id: c._id.toString(),
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      displayName: c.displayName,
      phone: c.phone || null,
      status: c.status,
      emailVerified: c.emailVerified,
      createdAt: c.createdAt,
    }));
  }
}

export const adminCustomerService = new AdminCustomerService();
