/**
 * VÉRONA — Support Context Resolution & Ownership Verification (Phase 26)
 *
 * Enforces strict anti-IDOR validation on referenced entities (Order, Shipment, Return, Refund, Product).
 * Guarantees that customers can only reference resources they own, preventing cross-tenant information leakage.
 */

import {
  OrderModel,
  ShipmentModel,
  ReturnRequestModel,
  RefundModel,
  ProductModel,
} from "@/db/models";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { SupportTicketContextDTO } from "../types/support.types";
import { ISupportTicket } from "@/types/database";

export class SupportContextService {
  /**
   * Strictly validates that all referenced context resources exist and belong
   * to the authenticated customer (anti-IDOR guard).
   */
  async validateContextOwnership(
    customerId: string,
    contextIds: {
      orderId?: string;
      shipmentId?: string;
      returnRequestId?: string;
      refundId?: string;
      productId?: string;
    }
  ): Promise<void> {
    const { orderId, shipmentId, returnRequestId, refundId, productId } = contextIds;

    // 1. Validate Order ownership
    if (orderId) {
      const order = await OrderModel.findById(orderId).select("customerId").lean();
      if (!order) {
        throw new NotFoundError("Referenced order does not exist.");
      }
      if (order.customerId.toString() !== customerId) {
        throw new ForbiddenError("Unauthorized: Referenced order does not belong to your account.");
      }
    }

    // 2. Validate Return Request ownership
    if (returnRequestId) {
      const returnReq = await ReturnRequestModel.findById(returnRequestId).select("customerId").lean();
      if (!returnReq) {
        throw new NotFoundError("Referenced return request does not exist.");
      }
      if (returnReq.customerId.toString() !== customerId) {
        throw new ForbiddenError("Unauthorized: Referenced return request does not belong to your account.");
      }
    }

    // 3. Validate Refund ownership
    if (refundId) {
      const refund = await RefundModel.findById(refundId).select("customerId").lean();
      if (!refund) {
        throw new NotFoundError("Referenced refund does not exist.");
      }
      if (refund.customerId.toString() !== customerId) {
        throw new ForbiddenError("Unauthorized: Referenced refund does not belong to your account.");
      }
    }

    // 4. Validate Shipment ownership (via associated Order)
    if (shipmentId) {
      const shipment = await ShipmentModel.findById(shipmentId).select("orderId").lean();
      if (!shipment) {
        throw new NotFoundError("Referenced shipment does not exist.");
      }
      const order = await OrderModel.findById(shipment.orderId).select("customerId").lean();
      if (!order || order.customerId.toString() !== customerId) {
        throw new ForbiddenError("Unauthorized: Referenced shipment does not belong to your account.");
      }
    }

    // 5. Validate Product existence
    if (productId) {
      const product = await ProductModel.findById(productId).select("_id").lean();
      if (!product) {
        throw new NotFoundError("Referenced catalogue product does not exist.");
      }
    }
  }

  /**
   * Safely loads summary context previews for customer and staff views.
   */
  async loadTicketContext(ticket: ISupportTicket): Promise<SupportTicketContextDTO> {
    const context: SupportTicketContextDTO = {};

    const orderIdToLoad = ticket.orderId || ticket.relatedOrderId;

    const [order, shipment, returnReq, refund, product] = await Promise.all([
      orderIdToLoad ? OrderModel.findById(orderIdToLoad).lean() : null,
      ticket.shipmentId ? ShipmentModel.findById(ticket.shipmentId).lean() : null,
      ticket.returnRequestId ? ReturnRequestModel.findById(ticket.returnRequestId).lean() : null,
      ticket.refundId ? RefundModel.findById(ticket.refundId).lean() : null,
      ticket.productId ? ProductModel.findById(ticket.productId).lean() : null,
    ]);

    if (order) {
      context.order = {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        totalMinor: order.pricing?.total || 0,
        currency: order.pricing?.currency || "INR",
        createdAt: order.createdAt.toISOString(),
      };
    }

    if (shipment) {
      context.shipment = {
        id: shipment._id.toString(),
        trackingNumber: shipment.awbNumber || shipment.shipmentNumber,
        carrier: shipment.provider,
        status: shipment.status,
        trackingUrl: shipment.trackingUrl || undefined,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate?.toISOString(),
      };
    }

    if (returnReq) {
      context.returnRequest = {
        id: returnReq._id.toString(),
        returnNumber: returnReq.returnNumber,
        status: returnReq.status,
        returnMethod: returnReq.type || "RETURN",
        pickupScheduledDate: returnReq.pickupScheduledAt?.toISOString(),
      };
    }

    if (refund) {
      context.refund = {
        id: refund._id.toString(),
        refundNumber: refund.refundNumber,
        amountMinor: refund.amount || 0,
        currency: refund.currency || "INR",
        status: refund.status,
        sourceType: refund.sourceType || "ORIGINAL_PAYMENT",
      };
    }

    if (product) {
      context.product = {
        id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        sku: product.slug,
        thumbnailUrl: (product.images as Array<{ url: string }>)?.[0]?.url,
      };
    }

    return context;
  }
}

export const supportContextService = new SupportContextService();
