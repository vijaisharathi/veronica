/**
 * VÉRONA — Shipment Lifecycle & Tracking Service (Phase 21)
 *
 * Manages shipment events, status progression, carrier webhook ingestion,
 * tracking reconciliation, and customer-facing tracking timeline construction.
 */

import { fulfillmentRepository } from "../repositories/fulfillment.repository";
import { shippingProviderService } from "./shipping-provider.service";
import { orderService } from "@/modules/orders/services/order.service";
import { OrderModel, PackageModel, WarehouseModel } from "@/db/models";
import {
  assertValidShipmentTransition,
  isTerminalShipmentState,
  mapProviderStatus,
  SHIPMENT_STATUS_LABELS,
} from "../state-machine/shipment-state-machine";
import {
  ShipmentStatus,
  ShipmentEventSource,
  FulfillmentStatus,
  OrderStatus,
} from "@/constants/status";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { IShipment, IShipmentEvent, IStaff } from "@/types/database";
import {
  ShipmentDTO,
  ShipmentEventDTO,
  CustomerShipmentTrackingDTO,
  CustomerTrackingTimelineStep,
  OrderTrackingDTO,
  ShipmentFilterOptions,
} from "../types/fulfillment.types";

export interface RecordShipmentEventInput {
  status: ShipmentStatus;
  providerStatus?: string;
  location?: string;
  description: string;
  source: ShipmentEventSource;
  eventTime?: Date;
  providerEventId?: string;
  rawReference?: Record<string, unknown>;
}

export class ShipmentService {
  /**
   * Helper: Enforces server-side warehouse scoping for staff.
   */
  assertWarehouseScope(warehouseId: string, staff?: IStaff): void {
    if (!staff) return;
    if (staff.assignedWarehouseId && staff.assignedWarehouseId.toString() !== warehouseId) {
      throw new AuthorizationError(
        `Warehouse scope violation: Staff is restricted to warehouse ${staff.assignedWarehouseId}`
      );
    }
  }

  // ── 1. Record Shipment Event & Status Transition ──────────────────────────

  /**
   * Records a tracking event for a shipment, transitions status if needed,
   * and synchronizes fulfillment and order states.
   */
  async recordShipmentEvent(
    shipmentId: string,
    input: RecordShipmentEventInput,
    actorStaff?: IStaff
  ): Promise<ShipmentEventDTO> {
    const shipment = await fulfillmentRepository.findShipmentById(shipmentId);
    if (!shipment) {
      throw new NotFoundError("Shipment not found");
    }

    this.assertWarehouseScope(shipment.warehouseId, actorStaff);

    // Idempotency: skip if this providerEventId was already recorded
    if (input.providerEventId) {
      const alreadyRecorded = await fulfillmentRepository.hasShipmentEvent(
        shipmentId,
        input.providerEventId
      );
      if (alreadyRecorded) {
        logger.info("Duplicate shipment event ignored", {
          context: "ShipmentService",
          metadata: { shipmentId, providerEventId: input.providerEventId },
        });
        const events = await fulfillmentRepository.findShipmentEvents(shipmentId);
        const existing = events.find((e) => e.providerEventId === input.providerEventId);
        if (existing) {
          return this.mapShipmentEventToDTO(existing);
        }
      }
    }

    const eventTime = input.eventTime || new Date();
    const isStatusChange = input.status !== shipment.status;

    if (isStatusChange) {
      assertValidShipmentTransition(shipment.status, input.status);

      const updatePayload: Record<string, unknown> = {
        status: input.status,
      };

      if (
        (input.status === ShipmentStatus.PICKED_UP || input.status === ShipmentStatus.IN_TRANSIT) &&
        !shipment.shippedAt
      ) {
        updatePayload.shippedAt = eventTime;
      }

      if (input.status === ShipmentStatus.DELIVERED) {
        updatePayload.deliveredAt = eventTime;
      }

      await fulfillmentRepository.updateShipment(shipmentId, updatePayload);

      logger.info("Shipment status transitioned", {
        context: "ShipmentService",
        metadata: {
          shipmentNumber: shipment.shipmentNumber,
          from: shipment.status,
          to: input.status,
          source: input.source,
        },
      });

      // Synchronize Order and Fulfillment states
      await this.synchronizeOrderAndFulfillment(shipment, input.status, actorStaff?.email);
    }

    // Persist event in audit trail
    const event = await fulfillmentRepository.recordShipmentEvent({
      shipmentId,
      status: input.status,
      providerStatus: input.providerStatus,
      location: input.location,
      description: input.description,
      eventTime,
      source: input.source,
      providerEventId: input.providerEventId,
      rawReference: input.rawReference,
    });

    return this.mapShipmentEventToDTO(event);
  }

  // ── 2. Order & Fulfillment Synchronization ────────────────────────────────

  /**
   * Cascades shipment status changes to Fulfillment and Order models via domain services.
   */
  private async synchronizeOrderAndFulfillment(
    shipment: IShipment,
    newStatus: ShipmentStatus,
    actorIdentifier = "SYSTEM"
  ): Promise<void> {
    const order = await OrderModel.findById(shipment.orderId).lean();
    if (!order) return;

    // 1. Shipped synchronization: IN_TRANSIT or PICKED_UP
    if (newStatus === ShipmentStatus.PICKED_UP || newStatus === ShipmentStatus.IN_TRANSIT) {
      if (order.status === OrderStatus.PACKED || order.status === OrderStatus.PROCESSING) {
        try {
          await orderService.updateOrderStatusAsAdmin(
            order._id.toString(),
            actorIdentifier,
            OrderStatus.SHIPPED,
            `Shipment ${shipment.shipmentNumber} is now in transit`
          );
        } catch (err) {
          logger.warn("Could not transition order to SHIPPED", {
            context: "ShipmentService",
            metadata: { orderId: order._id.toString(), error: String(err) },
          });
        }
      }
    }

    // 2. Out for delivery synchronization
    if (newStatus === ShipmentStatus.OUT_FOR_DELIVERY) {
      if (order.status === OrderStatus.SHIPPED) {
        try {
          await orderService.updateOrderStatusAsAdmin(
            order._id.toString(),
            actorIdentifier,
            OrderStatus.OUT_FOR_DELIVERY,
            `Shipment ${shipment.shipmentNumber} is out for delivery`
          );
        } catch (err) {
          logger.warn("Could not transition order to OUT_FOR_DELIVERY", {
            context: "ShipmentService",
            metadata: { orderId: order._id.toString(), error: String(err) },
          });
        }
      }
    }

    // 3. Delivered synchronization: check if ALL shipments are delivered
    if (newStatus === ShipmentStatus.DELIVERED) {
      // Check all shipments for fulfillment
      const fulfillmentShipments = await fulfillmentRepository.findShipmentsByFulfillmentId(
        shipment.fulfillmentId
      );
      const allFulfillmentShipmentsDelivered = fulfillmentShipments.every(
        (s) => (s._id.toString() === shipment._id.toString() ? true : s.status === ShipmentStatus.DELIVERED)
      );

      if (allFulfillmentShipmentsDelivered) {
        await fulfillmentRepository.updateFulfillment(shipment.fulfillmentId, {
          status: FulfillmentStatus.COMPLETED,
          completedAt: new Date(),
        });
        logger.info("Fulfillment completed (all shipments delivered)", {
          context: "ShipmentService",
          metadata: { fulfillmentId: shipment.fulfillmentId },
        });
      }

      // Check all shipments for order
      const orderShipments = await fulfillmentRepository.findShipmentsByOrderId(shipment.orderId);
      const allOrderShipmentsDelivered = orderShipments.every(
        (s) => (s._id.toString() === shipment._id.toString() ? true : s.status === ShipmentStatus.DELIVERED)
      );

      if (allOrderShipmentsDelivered && order.status !== OrderStatus.DELIVERED) {
        try {
          await orderService.updateOrderStatusAsAdmin(
            order._id.toString(),
            actorIdentifier,
            OrderStatus.DELIVERED,
            "All shipments successfully delivered to customer"
          );
          logger.info("Order marked DELIVERED", {
            context: "ShipmentService",
            metadata: { orderId: order._id.toString() },
          });
        } catch (err) {
          logger.warn("Could not transition order to DELIVERED", {
            context: "ShipmentService",
            metadata: { orderId: order._id.toString(), error: String(err) },
          });
        }
      }
    }
  }

  // ── 3. Webhook Ingestion ──────────────────────────────────────────────────

  /**
   * Processes an incoming shipping carrier webhook event with signature verification
   * and idempotency protection.
   */
  async processShippingWebhook(
    providerName: string,
    signature: string,
    rawBody: string | Buffer,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
    const provider = shippingProviderService.getProvider(providerName);
    if (!provider) {
      return { success: false, error: `Unrecognized shipping provider: ${providerName}` };
    }

    // 1. Signature Verification
    const isValidSignature = provider.verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      logger.warn("Shipping webhook signature verification failed", {
        context: "ShipmentService",
        metadata: { provider: providerName },
      });
      return { success: false, error: "Invalid webhook signature" };
    }

    // 2. Extract Event Identifiers
    const eventId = String(payload.eventId || payload.id || payload.event_id || "");
    const eventType = String(payload.eventType || payload.type || payload.event || "tracking_update");
    const awbNumber = payload.awbNumber || payload.awb || payload.tracking_number;
    const providerShipmentId = payload.providerShipmentId || payload.shipment_id;
    const rawStatus = String(payload.status || payload.current_status || "");

    if (!eventId) {
      return { success: false, error: "Webhook payload missing required event ID" };
    }

    // 3. Idempotency Check
    const existingEvent = await fulfillmentRepository.findWebhookEvent(providerName, eventId);
    if (existingEvent) {
      logger.info("Duplicate shipping webhook received", {
        context: "ShipmentService",
        metadata: { provider: providerName, eventId },
      });
      return { success: true, duplicate: true };
    }

    // 4. Record Webhook Event in Pending status
    const webhookDoc = await fulfillmentRepository.recordWebhookEvent({
      provider: providerName,
      eventId,
      eventType,
      awbNumber: awbNumber ? String(awbNumber) : undefined,
      providerShipmentId: providerShipmentId ? String(providerShipmentId) : undefined,
      payload,
      status: "PENDING",
      receivedAt: new Date(),
    });

    // 5. Locate matching shipment
    let shipment: IShipment | null = null;
    if (awbNumber) {
      shipment = await fulfillmentRepository.findShipmentByAwb(String(awbNumber));
    }
    if (!shipment && providerShipmentId) {
      shipment = await fulfillmentRepository.findShipmentByProviderShipmentId(
        providerName,
        String(providerShipmentId)
      );
    }

    if (!shipment) {
      logger.warn("Shipment not found for incoming webhook", {
        context: "ShipmentService",
        metadata: { provider: providerName, awbNumber, providerShipmentId },
      });
      await fulfillmentRepository.updateWebhookEventStatus(
        webhookDoc._id.toString(),
        "PROCESSED",
        "Shipment not found in local system"
      );
      return { success: true };
    }

    // 6. Map carrier status to canonical ShipmentStatus
    const canonicalStatus = mapProviderStatus(rawStatus);
    if (!canonicalStatus) {
      logger.info("Unmapped carrier status received", {
        context: "ShipmentService",
        metadata: { provider: providerName, rawStatus },
      });
      await fulfillmentRepository.updateWebhookEventStatus(webhookDoc._id.toString(), "PROCESSED");
      return { success: true };
    }

    // 7. Record shipment event and cascade transitions
    const location = String(payload.location || payload.city || "");
    const description = String(
      payload.description || payload.message || `Carrier update: ${rawStatus}`
    );

    try {
      await this.recordShipmentEvent(shipment._id.toString(), {
        status: canonicalStatus,
        providerStatus: rawStatus,
        location: location || undefined,
        description,
        source: ShipmentEventSource.WEBHOOK,
        providerEventId: eventId,
        rawReference: payload,
      });

      await fulfillmentRepository.updateWebhookEventStatus(webhookDoc._id.toString(), "PROCESSED");
      return { success: true };
    } catch (err) {
      logger.error("Error processing shipment webhook event", {
        context: "ShipmentService",
        metadata: { eventId, error: String(err) },
      });
      await fulfillmentRepository.updateWebhookEventStatus(
        webhookDoc._id.toString(),
        "FAILED",
        String(err)
      );
      return { success: false, error: String(err) };
    }
  }

  // ── 4. Reconciliation ─────────────────────────────────────────────────────

  /**
   * Reconcile shipment status with the shipping provider API.
   * Useful for periodic sync jobs or manual staff trigger.
   */
  async reconcileShipment(
    shipmentId: string,
    actorStaff?: IStaff
  ): Promise<{ reconciled: boolean; currentStatus: ShipmentStatus; message: string }> {
    const shipment = await fulfillmentRepository.findShipmentById(shipmentId);
    if (!shipment) {
      throw new NotFoundError("Shipment not found");
    }

    this.assertWarehouseScope(shipment.warehouseId, actorStaff);

    if (isTerminalShipmentState(shipment.status)) {
      return {
        reconciled: false,
        currentStatus: shipment.status,
        message: `Shipment is in terminal state '${shipment.status}'. No reconciliation needed.`,
      };
    }

    if (!shipment.awbNumber) {
      return {
        reconciled: false,
        currentStatus: shipment.status,
        message: "Shipment does not have an AWB number. Cannot query tracking provider.",
      };
    }

    const provider = shippingProviderService.getProvider(shipment.provider);
    if (!provider || !provider.capabilities.trackShipment) {
      return {
        reconciled: false,
        currentStatus: shipment.status,
        message: `Provider '${shipment.provider}' does not support tracking queries.`,
      };
    }

    const trackResult = await provider.trackShipment(shipment.awbNumber);
    if (!trackResult.success || !trackResult.events || trackResult.events.length === 0) {
      return {
        reconciled: false,
        currentStatus: shipment.status,
        message: trackResult.error || "No tracking updates available from provider.",
      };
    }

    // Process events chronologically
    let latestStatus = shipment.status;
    for (const evt of trackResult.events) {
      const canonical = mapProviderStatus(evt.status);
      if (canonical) {
        await this.recordShipmentEvent(shipmentId, {
          status: canonical,
          providerStatus: evt.status,
          location: evt.location,
          description: evt.description,
          source: ShipmentEventSource.RECONCILIATION,
          eventTime: new Date(evt.eventTime),
          providerEventId: evt.eventId,
        });
        latestStatus = canonical;
      }
    }

    return {
      reconciled: true,
      currentStatus: latestStatus,
      message: `Reconciliation complete. Processed ${trackResult.events.length} event(s).`,
    };
  }

  // ── 5. Customer Tracking Timeline ─────────────────────────────────────────

  /**
   * Generates a customer-facing tracking view for an order.
   * Includes timeline progress, tracking numbers, and packaged items.
   */
  async getCustomerOrderTracking(
    orderNumber: string,
    customerId?: string
  ): Promise<OrderTrackingDTO> {
    const order = await OrderModel.findOne({ orderNumber }).lean();
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Enforce customer ownership if request is customer-scoped
    if (customerId && order.customerId !== customerId) {
      throw new AuthorizationError("You do not have permission to view tracking for this order");
    }

    const shipments = await fulfillmentRepository.findShipmentsByOrderId(order._id.toString());
    const customerShipments: CustomerShipmentTrackingDTO[] = [];

    for (const shipment of shipments) {
      const events = await fulfillmentRepository.findShipmentEvents(shipment._id.toString());
      const pkg = shipment.packageId
        ? await fulfillmentRepository.findPackageById(shipment.packageId)
        : null;

      // Extract items in this shipment package
      const items: {
        sku: string;
        productName: string;
        color: string;
        size: string;
        quantity: number;
      }[] = [];

      if (pkg) {
        const orderItemMap = new Map(order.items.map((i) => [i.sku, i]));
        for (const pItem of pkg.items) {
          const match = orderItemMap.get(pItem.sku);
          items.push({
            sku: pItem.sku,
            productName: match?.productName || "Garment",
            color: match?.color || "",
            size: match?.size || "",
            quantity: pItem.quantity,
          });
        }
      } else {
        // Fallback to all order items if single-package / untracked
        for (const oItem of order.items) {
          items.push({
            sku: oItem.sku,
            productName: oItem.productName,
            color: oItem.color,
            size: oItem.size,
            quantity: oItem.quantity,
          });
        }
      }

      const timeline = this.buildCustomerTimeline(shipment, events);

      customerShipments.push({
        shipmentNumber: shipment.shipmentNumber,
        awbNumber: shipment.awbNumber,
        trackingUrl: shipment.trackingUrl,
        provider: shipment.provider,
        status: shipment.status,
        statusLabel: SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate?.toISOString(),
        shippedAt: shipment.shippedAt?.toISOString(),
        deliveredAt: shipment.deliveredAt?.toISOString(),
        items,
        timeline,
      });
    }

    return {
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      shipments: customerShipments,
    };
  }

  /**
   * Builds customer-facing timeline steps based on shipment status progression.
   */
  private buildCustomerTimeline(
    shipment: IShipment,
    events: IShipmentEvent[]
  ): CustomerTrackingTimelineStep[] {
    const stepsConfig: { status: ShipmentStatus; label: string; description: string }[] = [
      {
        status: ShipmentStatus.LABEL_CREATED,
        label: "Order Packed & Label Created",
        description: "Your package is prepared and awaiting carrier pickup.",
      },
      {
        status: ShipmentStatus.PICKED_UP,
        label: "Picked Up by Carrier",
        description: "Carrier has received the package from our warehouse.",
      },
      {
        status: ShipmentStatus.IN_TRANSIT,
        label: "In Transit",
        description: "Your package is on its way to your destination city.",
      },
      {
        status: ShipmentStatus.OUT_FOR_DELIVERY,
        label: "Out for Delivery",
        description: "Package is with our courier partner for final delivery today.",
      },
      {
        status: ShipmentStatus.DELIVERED,
        label: "Delivered",
        description: "Package has been successfully delivered.",
      },
    ];

    const currentStatusIndex = stepsConfig.findIndex((s) => s.status === shipment.status);
    const eventMap = new Map(events.map((e) => [e.status, e]));

    return stepsConfig.map((step, idx) => {
      const isCompleted = currentStatusIndex >= idx;
      const isCurrent = shipment.status === step.status;
      const matchedEvent = eventMap.get(step.status);

      return {
        status: step.status,
        label: step.label,
        description: matchedEvent?.description || step.description,
        timestamp: matchedEvent?.eventTime?.toISOString(),
        location: matchedEvent?.location,
        isCompleted,
        isCurrent,
      };
    });
  }

  // ── 6. Queries & Mappings ─────────────────────────────────────────────────

  async getShipmentById(id: string): Promise<ShipmentDTO> {
    const shipment = await fulfillmentRepository.findShipmentById(id);
    if (!shipment) {
      throw new NotFoundError("Shipment not found");
    }

    const events = await fulfillmentRepository.findShipmentEvents(id);
    return this.mapShipmentToDTO(shipment, events);
  }

  async listShipments(
    filters: ShipmentFilterOptions,
    pagination: { page?: number; limit?: number } = {},
    actorStaff?: IStaff
  ): Promise<{
    items: ShipmentDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const effectiveFilters = { ...filters };
    if (actorStaff?.assignedWarehouseId) {
      effectiveFilters.warehouseId = actorStaff.assignedWarehouseId.toString();
    }

    const paginated = await fulfillmentRepository.findShipments(effectiveFilters, pagination);
    const items = paginated.items.map((s) => this.mapShipmentToDTO(s));

    return {
      ...paginated,
      items,
    };
  }

  // ── Private Mappers ───────────────────────────────────────────────────────

  private mapShipmentToDTO(s: IShipment, events?: IShipmentEvent[]): ShipmentDTO {
    return {
      id: s._id.toString(),
      shipmentNumber: s.shipmentNumber,
      orderId: s.orderId,
      fulfillmentId: s.fulfillmentId,
      packageId: s.packageId,
      warehouseId: s.warehouseId,
      provider: s.provider,
      providerShipmentId: s.providerShipmentId,
      awbNumber: s.awbNumber,
      trackingUrl: s.trackingUrl,
      status: s.status,
      serviceLevel: s.serviceLevel,
      estimatedDeliveryDate: s.estimatedDeliveryDate?.toISOString(),
      shippedAt: s.shippedAt?.toISOString(),
      deliveredAt: s.deliveredAt?.toISOString(),
      events: events?.map((e) => this.mapShipmentEventToDTO(e)),
      createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: s.updatedAt ? s.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private mapShipmentEventToDTO(e: IShipmentEvent): ShipmentEventDTO {
    return {
      id: e._id.toString(),
      shipmentId: e.shipmentId,
      status: e.status,
      providerStatus: e.providerStatus,
      location: e.location,
      description: e.description,
      eventTime: e.eventTime ? e.eventTime.toISOString() : new Date().toISOString(),
      source: e.source,
    };
  }
}

export const shipmentService = new ShipmentService();
