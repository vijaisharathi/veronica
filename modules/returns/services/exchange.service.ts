/**
 * VÉRONA — Exchange Orchestration Service (Phase 22)
 *
 * Authoritative lifecycle for garment size & color exchanges:
 * Request -> Replacement Validation -> Availability Check -> Stock Reservation ->
 * Approval -> Original Item Return -> Inspection -> Fulfillment Handoff.
 *
 * Strict boundaries:
 * - Reuses Phase 20 ReservationService for atomic stock hold
 * - Reuses Phase 21 FulfillmentService for replacement shipment handoff
 * - Prevents arbitrary order or fulfillment creation
 * - Enforces customer ownership (Anti-IDOR)
 */

import { returnRepository } from "../repositories/return.repository";
import { returnEligibilityService } from "../eligibility/return-eligibility.service";
import { returnService } from "./return.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { reservationService } from "@/modules/inventory/services/reservation.service";
import { ExchangeStateMachine } from "../state-machine/exchange-state-machine";
import {
  ExchangeStatus,
  ReturnStatus,
  ReturnType,
} from "@/constants/status";
import {
  CreateExchangeRequestInput,
  ExchangeCustomerDto,
  ExchangeAdminDto,
  ExchangeFilters,
} from "../types/return.types";
import {
  OrderModel,
  ProductVariantModel,
  ProductModel,
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
import { IStaff, IExchangeRequest } from "@/types/database";

export class ExchangeService {
  /**
   * Customer initiates an exchange request for a purchased garment item.
   */
  async createExchangeRequest(
    input: CreateExchangeRequestInput,
    customerId: string
  ): Promise<ExchangeCustomerDto> {
    // 1. Assert return eligibility on original order item
    const eligibility = await returnEligibilityService.assertCanReturnItems(
      input.orderId,
      [{ orderItemId: input.originalOrderItemId, quantity: input.quantity, reason: input.reason }],
      customerId
    );

    const order = await OrderModel.findById(input.orderId).lean();
    if (!order) {
      throw new NotFoundError("Order", input.orderId);
    }

    const originalItem = order.items.find((i) => (i as any)._id?.toString() === input.originalOrderItemId);
    if (!originalItem) {
      throw new ValidationError(`Original order item ${input.originalOrderItemId} not found.`);
    }

    // 2. Validate replacement variant existence and status
    const replacementVariant = await ProductVariantModel.findById(input.requestedVariantId).lean();
    if (!replacementVariant) {
      throw new NotFoundError("ProductVariant", input.requestedVariantId);
    }
    if (replacementVariant.status !== "ACTIVE") {
      throw new ConflictError("Selected replacement variant is discontinued or inactive.");
    }

    // 3. Variant verification: Must belong to same product (garment size/color exchange)
    if (replacementVariant.productId.toString() !== originalItem.productId.toString()) {
      throw new ValidationError(
        "Exchanges are only supported for size or color variants of the same product."
      );
    }

    if (replacementVariant._id.toString() === originalItem.variantId.toString()) {
      throw new ValidationError(
        "Replacement variant cannot be identical to the original purchased item. Please select a different size or color."
      );
    }

    // 4. Check real-time stock availability
    const availability = await inventoryService.getVariantAvailability(input.requestedVariantId);
    if (!availability.isAvailable || (availability.totalAvailable !== undefined && availability.totalAvailable < input.quantity)) {
      throw new ConflictError(
        `Replacement variant (${replacementVariant.sku}) is currently out of stock.`
      );
    }

    // 5. Generate collision-free exchange reference
    const exchangeNumber = await returnRepository.generateExchangeNumber();

    // 6. Create linked ReturnRequest for reverse logistics of original garment
    const linkedReturn = await returnService.createReturnRequest(
      {
        orderId: input.orderId,
        customerId,
        type: ReturnType.EXCHANGE,
        reason: input.reason,
        description: input.description,
        evidenceImages: input.evidenceImages,
        items: [
          {
            orderItemId: input.originalOrderItemId,
            quantity: input.quantity,
            reason: input.reason,
          },
        ],
        pickupAddressId: input.pickupAddressId,
        pickupAddressSnapshot: input.pickupAddressSnapshot,
      },
      customerId
    );

    // 7. Persist ExchangeRequest document
    const exchangeDoc = await returnRepository.createExchange({
      exchangeNumber,
      returnRequestId: linkedReturn.id,
      orderId: order._id.toString(),
      customerId,
      originalItem: {
        orderItemId: input.originalOrderItemId,
        variantId: originalItem.variantId.toString(),
        productId: originalItem.productId.toString(),
        sku: originalItem.sku,
        productName: originalItem.productName,
        quantity: input.quantity,
        unitPriceMinor: originalItem.finalPrice ?? originalItem.unitPrice,
      },
      requestedVariantId: input.requestedVariantId,
      replacementProductId: replacementVariant.productId.toString(),
      replacementSku: replacementVariant.sku,
      replacementSize: replacementVariant.size,
      replacementColor: typeof replacementVariant.color === "object" ? replacementVariant.color.name : replacementVariant.color,
      quantity: input.quantity,
      reason: input.reason,
      status: ExchangeStatus.REQUESTED,
      notes: input.description,
    });

    await this.logAuditEvent({
      actor: customerId,
      actorType: "CUSTOMER",
      action: "exchange.requested",
      resourceId: exchangeDoc._id.toString(),
      previousState: null,
      newState: ExchangeStatus.REQUESTED,
      reason: input.reason,
    });

    logger.info("Exchange request created", {
      context: "ExchangeService",
      metadata: {
        exchangeNumber,
        originalSku: originalItem.sku,
        replacementSku: replacementVariant.sku,
        quantity: input.quantity,
      },
    });

    return this.mapToCustomerDto(exchangeDoc, order.orderNumber);
  }

  /**
   * Admin approves exchange request and reserves replacement inventory.
   */
  async approveExchange(
    idOrNumber: string,
    input: { notes?: string },
    actorStaff: IStaff
  ): Promise<ExchangeAdminDto> {
    const exchange = await returnRepository.findExchangeById(idOrNumber);
    if (!exchange) {
      throw new NotFoundError("ExchangeRequest", idOrNumber);
    }

    ExchangeStateMachine.assertValidTransition(
      exchange.status,
      ExchangeStatus.APPROVED,
      exchange.exchangeNumber
    );

    // Atomically reserve replacement stock via Phase 20 ReservationService
    let reservationId: string | undefined;
    try {
      const reservation = await reservationService.reserveItem(
        {
          variantId: exchange.requestedVariantId.toString(),
          quantity: exchange.quantity,
          referenceType: "EXCHANGE",
          referenceId: exchange.exchangeNumber,
          expiresInMinutes: 14 * 24 * 60, // 14 days reservation window for return transit
          metadata: { exchangeNumber: exchange.exchangeNumber },
        },
        actorStaff.email
      );
      reservationId = reservation.reservationId;
    } catch (err) {
      logger.error("Failed to reserve replacement stock for exchange", {
        context: "ExchangeService",
        error: err instanceof Error ? err.message : String(err),
      });
      throw new ConflictError(
        `Could not reserve replacement stock: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const updated = await returnRepository.updateExchange(exchange._id.toString(), {
      status: ExchangeStatus.APPROVED,
      reservationId,
      approvedAt: new Date(),
      approvedBy: actorStaff.email,
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "exchange.approved",
      resourceId: exchange._id.toString(),
      previousState: exchange.status,
      newState: ExchangeStatus.APPROVED,
      reason: input.notes,
    });

    return this.mapToAdminDto(updated!);
  }

  /**
   * Admin rejects exchange request.
   */
  async rejectExchange(
    idOrNumber: string,
    input: { reason?: string },
    actorStaff: IStaff
  ): Promise<ExchangeAdminDto> {
    const exchange = await returnRepository.findExchangeById(idOrNumber);
    if (!exchange) {
      throw new NotFoundError("ExchangeRequest", idOrNumber);
    }

    ExchangeStateMachine.assertValidTransition(
      exchange.status,
      ExchangeStatus.REJECTED,
      exchange.exchangeNumber
    );

    // Release reservation if one was held
    if (exchange.reservationId) {
      try {
        await reservationService.releaseReservation({
          reservationId: exchange.reservationId,
          reason: "Exchange rejected",
        });
      } catch (err) {
        logger.warn("Could not release reservation on exchange rejection", {
          context: "ExchangeService",
          reservationId: exchange.reservationId,
        });
      }
    }

    const updated = await returnRepository.updateExchange(exchange._id.toString(), {
      status: ExchangeStatus.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorStaff.email,
      rejectionReason: input.reason || "Exchange rejected per operational review",
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "exchange.rejected",
      resourceId: exchange._id.toString(),
      previousState: exchange.status,
      newState: ExchangeStatus.REJECTED,
      reason: input.reason,
    });

    return this.mapToAdminDto(updated!);
  }

  /**
   * Customer cancels an exchange request before pickup.
   */
  async cancelExchangeByCustomer(
    idOrNumber: string,
    customerId: string,
    reason?: string
  ): Promise<ExchangeCustomerDto> {
    const exchange = await returnRepository.findExchangeById(idOrNumber);
    if (!exchange) {
      throw new NotFoundError("ExchangeRequest", idOrNumber);
    }

    if (exchange.customerId.toString() !== customerId) {
      throw new AuthorizationError("You do not have permission to cancel this exchange.");
    }

    if (!ExchangeStateMachine.isCancellable(exchange.status)) {
      throw new ConflictError(
        `Cannot cancel exchange in status "${exchange.status}". Process is already finalized.`
      );
    }

    ExchangeStateMachine.assertValidTransition(
      exchange.status,
      ExchangeStatus.CANCELLED,
      exchange.exchangeNumber
    );

    if (exchange.reservationId) {
      try {
        await reservationService.releaseReservation({
          reservationId: exchange.reservationId,
          reason: "Customer cancelled exchange",
        });
      } catch (err) {
        logger.warn("Failed to release reservation on customer cancellation", {
          context: "ExchangeService",
          reservationId: exchange.reservationId,
        });
      }
    }

    const updated = await returnRepository.updateExchange(exchange._id.toString(), {
      status: ExchangeStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: customerId,
    });

    // Also cancel linked return if present
    if (exchange.returnRequestId) {
      try {
        await returnService.cancelReturnByCustomer(
          exchange.returnRequestId.toString(),
          customerId,
          "Cancelled via exchange cancellation"
        );
      } catch {
        // Safe to ignore if already handled
      }
    }

    await this.logAuditEvent({
      actor: customerId,
      actorType: "CUSTOMER",
      action: "exchange.cancelled",
      resourceId: exchange._id.toString(),
      previousState: exchange.status,
      newState: ExchangeStatus.CANCELLED,
      reason: reason || "Cancelled by customer",
    });

    const order = await OrderModel.findById(exchange.orderId).lean();
    return this.mapToCustomerDto(updated!, order?.orderNumber);
  }

  /**
   * Handoff exchange for fulfillment dispatch once return item is verified.
   */
  async handoffExchangeFulfillment(
    idOrNumber: string,
    actorStaff: IStaff
  ): Promise<ExchangeAdminDto> {
    const exchange = await returnRepository.findExchangeById(idOrNumber);
    if (!exchange) {
      throw new NotFoundError("ExchangeRequest", idOrNumber);
    }

    ExchangeStateMachine.assertValidTransition(
      exchange.status,
      ExchangeStatus.FULFILLED,
      exchange.exchangeNumber
    );

    const updated = await returnRepository.updateExchange(exchange._id.toString(), {
      status: ExchangeStatus.FULFILLED,
      completedAt: new Date(),
    });

    await this.logAuditEvent({
      actor: actorStaff.email,
      actorType: "STAFF",
      action: "exchange.fulfilled",
      resourceId: exchange._id.toString(),
      previousState: exchange.status,
      newState: ExchangeStatus.FULFILLED,
    });

    return this.mapToAdminDto(updated!);
  }

  /**
   * Customer exchange lookup.
   */
  async getExchangeForCustomer(
    idOrNumber: string,
    customerId: string
  ): Promise<ExchangeCustomerDto> {
    const exchange = await returnRepository.findExchangeById(idOrNumber);
    if (!exchange) {
      throw new NotFoundError("ExchangeRequest", idOrNumber);
    }

    if (exchange.customerId.toString() !== customerId) {
      throw new AuthorizationError("You do not have permission to view this exchange.");
    }

    const order = await OrderModel.findById(exchange.orderId).lean();
    return this.mapToCustomerDto(exchange, order?.orderNumber);
  }

  /**
   * Admin paginated exchanges query.
   */
  async findExchangesAdmin(
    filters: ExchangeFilters
  ): Promise<{ items: ExchangeAdminDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const result = await returnRepository.findExchanges(filters);

    const orderIds = Array.from(new Set(result.items.map((e) => e.orderId.toString())));
    const customerIds = Array.from(new Set(result.items.map((e) => e.customerId.toString())));

    const [orders, customers] = await Promise.all([
      OrderModel.find({ _id: { $in: orderIds } }, { orderNumber: 1 }).lean(),
      CustomerModel.find({ _id: { $in: customerIds } }, { email: 1, firstName: 1, lastName: 1 }).lean(),
    ]);

    const orderMap = new Map(orders.map((o) => [o._id.toString(), o.orderNumber]));
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    const adminDtos = result.items.map((item) => {
      const orderNumber = orderMap.get(item.orderId.toString());
      const customer = customerMap.get(item.customerId.toString());
      const base = this.mapToCustomerDto(item, orderNumber);

      return {
        ...base,
        customerId: item.customerId.toString(),
        customerEmail: customer?.email,
        approvedBy: item.approvedBy,
        rejectedBy: item.rejectedBy,
        rejectionReason: item.rejectionReason,
        cancelledBy: item.cancelledBy,
        reservationId: item.reservationId,
        notes: item.notes,
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

  mapToCustomerDto(doc: IExchangeRequest, orderNumber?: string): ExchangeCustomerDto {
    return {
      id: doc._id.toString(),
      exchangeNumber: doc.exchangeNumber,
      returnRequestId: doc.returnRequestId ? doc.returnRequestId.toString() : undefined,
      orderId: doc.orderId.toString(),
      orderNumber,
      originalItem: {
        orderItemId: doc.originalItem.orderItemId,
        variantId: doc.originalItem.variantId.toString(),
        productId: doc.originalItem.productId?.toString(),
        sku: doc.originalItem.sku,
        productName: doc.originalItem.productName,
        quantity: doc.originalItem.quantity,
      },
      replacementItem: {
        variantId: doc.requestedVariantId.toString(),
        productId: doc.replacementProductId?.toString(),
        sku: doc.replacementSku,
        size: doc.replacementSize,
        color: doc.replacementColor,
        quantity: doc.quantity,
      },
      reason: doc.reason,
      status: doc.status,
      timeline: {
        requestedAt: doc.createdAt.toISOString(),
        approvedAt: doc.approvedAt?.toISOString(),
        completedAt: doc.completedAt?.toISOString(),
        cancelledAt: doc.cancelledAt?.toISOString(),
      },
      fulfillment: {
        fulfillmentId: doc.fulfillmentId?.toString(),
        replacementOrderId: doc.replacementOrderId?.toString(),
      },
      createdAt: doc.createdAt.toISOString(),
    };
  }

  mapToAdminDto(doc: IExchangeRequest): ExchangeAdminDto {
    const customerDto = this.mapToCustomerDto(doc);
    return {
      ...customerDto,
      customerId: doc.customerId.toString(),
      approvedBy: doc.approvedBy,
      rejectedBy: doc.rejectedBy,
      rejectionReason: doc.rejectionReason,
      cancelledBy: doc.cancelledBy,
      reservationId: doc.reservationId,
      notes: doc.notes,
      metadata: doc.metadata,
    };
  }

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
        resource: "ExchangeRequest",
        resourceId: event.resourceId,
        previousState: event.previousState ? { status: event.previousState } : {},
        newState: { status: event.newState },
        reason: event.reason,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error("Failed to write audit log for exchange", {
        context: "ExchangeService",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export const exchangeService = new ExchangeService();
