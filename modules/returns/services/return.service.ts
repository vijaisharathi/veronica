/**
 * VÉRONA — Return Orchestration Service (Phase 22)
 *
 * Core domain service managing the return request lifecycle:
 * Request -> Review -> Approval/Rejection -> Pickup -> Transit -> Warehouse Receipt -> Settlement Readiness.
 *
 * Strict boundaries:
 * - Enforces State Machine transitions
 * - Enforces Customer Ownership (Anti-IDOR)
 * - Enforces Warehouse Scoping for staff mutations
 * - Emits audit logs and domain events
 * - Never calls Payment Gateway refund APIs (Phase 23 boundary)
 */

import { returnRepository } from "../repositories/return.repository";
import { returnEligibilityService } from "../eligibility/return-eligibility.service";
import { returnPolicyService } from "../policies/return-policy.service";
import { ReturnStateMachine } from "../state-machine/return-state-machine";
import {
  ReturnStatus,
  ReturnType,
  ReturnMethod,
} from "@/constants/status";
import {
  CreateReturnRequestInput,
  ReviewReturnInput,
  SchedulePickupInput,
  ConfirmPickupInput,
  ReceiveReturnInput,
  ReturnCustomerDto,
  ReturnAdminDto,
  ReturnFilters,
} from "../types/return.types";
import {
  OrderModel,
  AddressModel,
  WarehouseModel,
  CustomerModel,
  AuditLogModel,
} from "@/db/models";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { IReturnRequest, IStaff } from "@/types/database";

export class ReturnService {
  /**
   * Enforce warehouse-scoped authorization for warehouse staff.
   */
  assertWarehouseScope(warehouseId: string, staff?: IStaff): void {
    if (!staff) return;
    if (staff.roles?.includes("SUPER_ADMIN") || staff.roles?.includes("ADMIN")) return;

    if (staff.roles?.includes("WAREHOUSE_STAFF")) {
      const allowed = staff.assignedWarehouseId ? [staff.assignedWarehouseId] : [];
      if (allowed.length > 0 && !allowed.includes(warehouseId)) {
        throw new AuthorizationError(
          `Staff member is not authorized to operate on warehouse ${warehouseId}.`
        );
      }
    }
  }

  /**
   * Customer initiates a return request for eligible items.
   */
  async createReturnRequest(
    input: CreateReturnRequestInput,
    customerId: string
  ): Promise<ReturnCustomerDto> {
    // 1. Assert eligibility and cumulative quantity limits
    const eligibility = await returnEligibilityService.assertCanReturnItems(
      input.orderId,
      input.items,
      customerId
    );

    const order = await OrderModel.findById(input.orderId).lean();
    if (!order) {
      throw new NotFoundError("Order", input.orderId);
    }

    // 2. Resolve pickup address snapshot
    let pickupAddressSnapshot = order.shippingAddress;
    if (input.pickupAddressId) {
      const customAddress = await AddressModel.findOne({
        _id: input.pickupAddressId,
        customerId,
      }).lean();
      if (customAddress) {
        pickupAddressSnapshot = {
          fullName: customAddress.fullName,
          phone: customAddress.phone,
          addressLine1: customAddress.addressLine1,
          addressLine2: customAddress.addressLine2,
          landmark: customAddress.landmark,
          city: customAddress.city,
          state: customAddress.state,
          country: customAddress.country || "India",
          pincode: customAddress.pincode,
        };
      }
    }

    // 3. Formulate return items snapshotting original order details
    const orderItemMap = new Map(order.items.map((i) => [(i as any)._id ? (i as any)._id.toString() : "", i]));
    const returnItems = input.items.map((reqItem) => {
      const orderItem = orderItemMap.get(reqItem.orderItemId);
      if (!orderItem) {
        throw new ValidationError(`Order item ${reqItem.orderItemId} not found.`);
      }
      return {
        orderItemId: reqItem.orderItemId,
        productId: orderItem.productId.toString(),
        variantId: orderItem.variantId.toString(),
        sku: orderItem.sku,
        productName: orderItem.productName,
        color: orderItem.color,
        size: orderItem.size,
        quantity: reqItem.quantity,
        unitPriceMinor: orderItem.finalPrice ?? orderItem.unitPrice,
        reason: reqItem.reason,
        condition: reqItem.condition,
      };
    });

    const returnNumber = await returnRepository.generateReturnNumber();
    const returnWindowDays = returnPolicyService.getReturnWindowDays();
    const deliveredAt = eligibility.deliveredAt || new Date(order.updatedAt);

    const eligibleAmountMinor = returnItems.reduce(
      (sum, item) => sum + item.unitPriceMinor * item.quantity,
      0
    );

    const returnRequest = await returnRepository.createReturn({
      returnNumber,
      orderId: order._id.toString(),
      customerId,
      type: input.type || ReturnType.RETURN,
      reason: input.reason,
      description: input.description,
      evidenceImages: input.evidenceImages || [],
      status: ReturnStatus.REQUESTED,
      pickupAddressSnapshot,
      requestedAt: new Date(),
      items: returnItems as any,
      policySnapshot: {
        returnWindowDays,
        deliveredAt,
        policyVersion: returnPolicyService.version,
        eligibleAmountMinor,
      },
    });

    // Audit log
    await this.logAuditEvent({
      actor: customerId,
      actorType: "CUSTOMER",
      action: "return.requested",
      resourceId: returnRequest._id.toString(),
      previousState: null,
      newState: ReturnStatus.REQUESTED,
      reason: input.reason,
    });

    logger.info("Return request created", {
      context: "ReturnService",
      metadata: {
        returnNumber,
        orderId: input.orderId,
        customerId,
        itemCount: returnItems.length,
      },
    });

    return this.mapToCustomerDto(returnRequest, order.orderNumber);
  }

  /**
   * Get return details with customer ownership enforcement.
   */
  async getReturnForCustomer(
    idOrNumber: string,
    customerId: string
  ): Promise<ReturnCustomerDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    if (returnReq.customerId.toString() !== customerId) {
      throw new AuthorizationError("You do not have permission to view this return.");
    }

    const order = await OrderModel.findById(returnReq.orderId).lean();
    return this.mapToCustomerDto(returnReq, order?.orderNumber);
  }

  /**
   * Customer cancels an active return request.
   */
  async cancelReturnByCustomer(
    idOrNumber: string,
    customerId: string,
    reason?: string
  ): Promise<ReturnCustomerDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    if (returnReq.customerId.toString() !== customerId) {
      throw new AuthorizationError("You do not have permission to cancel this return.");
    }

    if (!ReturnStateMachine.isCancellable(returnReq.status)) {
      throw new ConflictError(
        `Cannot cancel return in status "${returnReq.status}". Pickup or inspection is already underway.`
      );
    }

    ReturnStateMachine.assertValidTransition(
      returnReq.status,
      ReturnStatus.CANCELLED,
      returnReq.returnNumber
    );

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), {
      status: ReturnStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: customerId,
    });

    await this.logAuditEvent({
      actor: customerId,
      actorType: "CUSTOMER",
      action: "return.cancelled",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: ReturnStatus.CANCELLED,
      reason: reason || "Cancelled by customer",
    });

    const order = await OrderModel.findById(returnReq.orderId).lean();
    return this.mapToCustomerDto(updated!, order?.orderNumber);
  }

  /**
   * Staff/Admin reviews and approves or rejects a return.
   */
  async reviewReturn(
    idOrNumber: string,
    input: ReviewReturnInput,
    actorStaff: IStaff
  ): Promise<ReturnAdminDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    const targetStatus = input.approved ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;

    ReturnStateMachine.assertValidTransition(
      returnReq.status,
      targetStatus,
      returnReq.returnNumber
    );

    const update: Partial<IReturnRequest> = {
      status: targetStatus,
    };

    if (input.approved) {
      update.approvedAt = new Date();
      update.approvedBy = actorStaff.email;
      if (input.warehouseId) {
        update.warehouseId = input.warehouseId;
      }
    } else {
      update.rejectedAt = new Date();
      update.rejectedBy = actorStaff.email;
      update.rejectionReason = input.rejectionReason || "Return request rejected by operational review";
    }

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), update);

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: input.approved ? "return.approved" : "return.rejected",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: targetStatus,
      reason: input.rejectionReason || input.notes,
    });

    return this.mapToAdminDto(updated!);
  }

  /**
   * Schedule reverse pickup for an approved return.
   */
  async schedulePickup(
    idOrNumber: string,
    input: SchedulePickupInput,
    actorStaff: IStaff
  ): Promise<ReturnAdminDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    ReturnStateMachine.assertValidTransition(
      returnReq.status,
      ReturnStatus.PICKUP_SCHEDULED,
      returnReq.returnNumber
    );

    const scheduledDate = input.scheduledDate ? new Date(input.scheduledDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), {
      status: ReturnStatus.PICKUP_SCHEDULED,
      pickupScheduledAt: scheduledDate,
      returnShipment: {
        provider: input.provider || "MANUAL",
        status: "PICKUP_SCHEDULED",
        scheduledPickupDate: scheduledDate,
      },
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "return.pickup_scheduled",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: ReturnStatus.PICKUP_SCHEDULED,
      reason: input.instructions,
    });

    return this.mapToAdminDto(updated!);
  }

  /**
   * Carrier/Staff confirms pickup event.
   */
  async confirmPickup(
    idOrNumber: string,
    input: ConfirmPickupInput,
    actorStaff: IStaff
  ): Promise<ReturnAdminDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    ReturnStateMachine.assertValidTransition(
      returnReq.status,
      ReturnStatus.PICKED_UP,
      returnReq.returnNumber
    );

    const actualDate = input.actualDate ? new Date(input.actualDate) : new Date();

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), {
      status: ReturnStatus.PICKED_UP,
      pickedUpAt: actualDate,
      returnShipment: {
        provider: returnReq.returnShipment?.provider || "MANUAL",
        trackingNumber: input.trackingNumber || returnReq.returnShipment?.trackingNumber,
        status: "PICKED_UP",
        actualPickupDate: actualDate,
      },
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "return.picked_up",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: ReturnStatus.PICKED_UP,
    });

    return this.mapToAdminDto(updated!);
  }

  /**
   * Warehouse staff marks package as received at the fulfillment facility.
   */
  async receiveReturn(
    idOrNumber: string,
    input: ReceiveReturnInput,
    actorStaff: IStaff
  ): Promise<ReturnAdminDto> {
    const returnReq = await returnRepository.findById(idOrNumber);
    if (!returnReq) {
      throw new NotFoundError("ReturnRequest", idOrNumber);
    }

    // Server-side warehouse scoping
    this.assertWarehouseScope(input.warehouseId, actorStaff);

    ReturnStateMachine.assertValidTransition(
      returnReq.status,
      ReturnStatus.RECEIVED,
      returnReq.returnNumber
    );

    const updated = await returnRepository.updateReturn(returnReq._id.toString(), {
      status: ReturnStatus.RECEIVED,
      warehouseId: input.warehouseId,
      receivedAt: new Date(),
      receivedBy: actorStaff.email,
      returnShipment: returnReq.returnShipment
        ? { ...returnReq.returnShipment, status: "DELIVERED_TO_WAREHOUSE" }
        : undefined,
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "return.received",
      resourceId: returnReq._id.toString(),
      previousState: returnReq.status,
      newState: ReturnStatus.RECEIVED,
      reason: input.notes,
    });

    logger.info("Return received at warehouse", {
      context: "ReturnService",
      metadata: {
        returnNumber: returnReq.returnNumber,
        warehouseId: input.warehouseId,
        receivedBy: actorStaff.email,
      },
    });

    return this.mapToAdminDto(updated!);
  }

  /**
   * Admin / Warehouse returns query with filters and pagination.
   */
  async findReturnsAdmin(
    filters: ReturnFilters,
    actorStaff?: IStaff
  ): Promise<{ items: ReturnAdminDto[]; total: number; page: number; limit: number; totalPages: number }> {
    // If staff is restricted to a warehouse, enforce filter
    if (actorStaff?.roles?.includes("WAREHOUSE_STAFF")) {
      const allowed = actorStaff.assignedWarehouseId ? [actorStaff.assignedWarehouseId] : [];
      if (allowed.length > 0) {
        filters.warehouseId = allowed[0];
      }
    }

    const result = await returnRepository.findReturns(filters);

    // Batch resolve order numbers and customer emails to prevent N+1 queries
    const orderIds = Array.from(new Set(result.items.map((r) => r.orderId.toString())));
    const customerIds = Array.from(new Set(result.items.map((r) => r.customerId.toString())));
    const warehouseIds = Array.from(new Set(result.items.map((r) => r.warehouseId?.toString()).filter(Boolean)));

    const [orders, customers, warehouses] = await Promise.all([
      OrderModel.find({ _id: { $in: orderIds } }, { orderNumber: 1 }).lean(),
      CustomerModel.find({ _id: { $in: customerIds } }, { email: 1, firstName: 1, lastName: 1 }).lean(),
      warehouseIds.length > 0
        ? WarehouseModel.find({ _id: { $in: warehouseIds } }, { code: 1, name: 1 }).lean()
        : [],
    ]);

    const orderMap = new Map(orders.map((o) => [o._id.toString(), o.orderNumber]));
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
    const warehouseMap = new Map(warehouses.map((w) => [w._id.toString(), w]));

    const adminDtos = result.items.map((item) => {
      const orderNumber = orderMap.get(item.orderId.toString());
      const customer = customerMap.get(item.customerId.toString());
      const warehouse = item.warehouseId ? warehouseMap.get(item.warehouseId.toString()) : undefined;

      const base = this.mapToCustomerDto(item, orderNumber);
      return {
        ...base,
        customerId: item.customerId.toString(),
        customerEmail: customer?.email,
        customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : undefined,
        warehouseId: item.warehouseId?.toString(),
        warehouseCode: warehouse?.code,
        warehouseName: warehouse?.name,
        approvedBy: item.approvedBy,
        rejectedBy: item.rejectedBy,
        rejectionReason: item.rejectionReason,
        receivedBy: item.receivedBy,
        inspectedBy: item.inspectedBy,
        cancelledBy: item.cancelledBy,
        refundRequestedAt: item.refundRequestedAt?.toISOString(),
        policySnapshot: item.policySnapshot
          ? {
              returnWindowDays: item.policySnapshot.returnWindowDays,
              deliveredAt: item.policySnapshot.deliveredAt.toISOString(),
              policyVersion: item.policySnapshot.policyVersion,
              eligibleAmountMinor: item.policySnapshot.eligibleAmountMinor,
            }
          : undefined,
        items: item.items.map((it) => ({
          orderItemId: it.orderItemId,
          productId: it.productId ? it.productId.toString() : "",
          variantId: it.variantId ? it.variantId.toString() : "",
          sku: it.sku,
          productName: it.productName,
          color: it.color,
          size: it.size,
          quantity: it.quantity,
          unitPriceMinor: it.unitPriceMinor,
          reason: it.reason,
          condition: it.condition,
          inspectionResult: it.inspectionResult,
          inspectionNotes: it.inspectionNotes,
          disposition: it.disposition,
        })),
        metadata: item.metadata,
      };
    });

    return {
      items: adminDtos,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Safe mapping from raw IReturnRequest to ReturnCustomerDto.
   * Strips internal notes, staff emails, and internal provider identifiers.
   */
  mapToCustomerDto(doc: IReturnRequest, orderNumber?: string): ReturnCustomerDto {
    return {
      id: doc._id.toString(),
      returnNumber: doc.returnNumber,
      orderId: doc.orderId.toString(),
      orderNumber,
      type: doc.type,
      status: doc.status,
      reason: doc.reason,
      description: doc.description,
      evidenceImages: doc.evidenceImages || [],
      pickupAddressSnapshot: doc.pickupAddressSnapshot,
      items: doc.items.map((i) => ({
        orderItemId: i.orderItemId,
        productId: i.productId ? i.productId.toString() : "",
        variantId: i.variantId ? i.variantId.toString() : "",
        sku: i.sku,
        productName: i.productName,
        color: i.color,
        size: i.size,
        quantity: i.quantity,
        unitPriceMinor: i.unitPriceMinor,
        reason: i.reason,
        condition: i.condition,
      })),
      tracking: doc.returnShipment
        ? {
            provider: doc.returnShipment.provider,
            trackingNumber: doc.returnShipment.trackingNumber,
            trackingUrl: doc.returnShipment.trackingUrl,
            status: doc.returnShipment.status,
            scheduledPickupDate: doc.returnShipment.scheduledPickupDate?.toISOString(),
            actualPickupDate: doc.returnShipment.actualPickupDate?.toISOString(),
          }
        : undefined,
      timeline: {
        requestedAt: doc.requestedAt.toISOString(),
        approvedAt: doc.approvedAt?.toISOString(),
        pickedUpAt: doc.pickedUpAt?.toISOString(),
        receivedAt: doc.receivedAt?.toISOString(),
        completedAt: doc.completedAt?.toISOString(),
        cancelledAt: doc.cancelledAt?.toISOString(),
      },
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Safe mapping from raw IReturnRequest to ReturnAdminDto.
   */
  mapToAdminDto(doc: IReturnRequest): ReturnAdminDto {
    const customerDto = this.mapToCustomerDto(doc);
    return {
      ...customerDto,
      customerId: doc.customerId.toString(),
      warehouseId: doc.warehouseId?.toString(),
      approvedBy: doc.approvedBy,
      rejectedBy: doc.rejectedBy,
      rejectionReason: doc.rejectionReason,
      receivedBy: doc.receivedBy,
      inspectedBy: doc.inspectedBy,
      cancelledBy: doc.cancelledBy,
      refundRequestedAt: doc.refundRequestedAt?.toISOString(),
      policySnapshot: doc.policySnapshot
        ? {
            returnWindowDays: doc.policySnapshot.returnWindowDays,
            deliveredAt: doc.policySnapshot.deliveredAt.toISOString(),
            policyVersion: doc.policySnapshot.policyVersion,
            eligibleAmountMinor: doc.policySnapshot.eligibleAmountMinor,
          }
        : undefined,
      items: doc.items.map((i) => ({
        orderItemId: i.orderItemId,
        productId: i.productId ? i.productId.toString() : "",
        variantId: i.variantId ? i.variantId.toString() : "",
        sku: i.sku,
        productName: i.productName,
        color: i.color,
        size: i.size,
        quantity: i.quantity,
        unitPriceMinor: i.unitPriceMinor,
        reason: i.reason,
        condition: i.condition,
        inspectionResult: i.inspectionResult,
        inspectionNotes: i.inspectionNotes,
        disposition: i.disposition,
      })),
      metadata: doc.metadata,
    };
  }

  /**
   * Helper: Record domain audit log event.
   */
  private async logAuditEvent(event: {
    actor: string;
    actorType: "CUSTOMER" | "STAFF" | "SYSTEM";
    action: string;
    resourceId: string;
    previousState: string | null;
    newState: string;
    reason?: string;
  }): Promise<void> {
    try {
      await AuditLogModel.create({
        actor: event.actor,
        actorType: event.actorType,
        action: event.action,
        resource: "ReturnRequest",
        resourceId: event.resourceId,
        previousState: event.previousState ? { status: event.previousState } : {},
        newState: { status: event.newState },
        reason: event.reason,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error("Failed to write audit log for return operation", {
        context: "ReturnService",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export const returnService = new ReturnService();
