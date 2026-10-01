/**
 * VÉRONA — Fulfillment Orchestration Service (Phase 21)
 *
 * Core domain service for managing the fulfillment lifecycle:
 * Allocation -> Pick -> Pack -> Package Creation -> Shipment Creation -> Completion/Cancellation.
 *
 * Enforces:
 * - State machine transitions
 * - Warehouse-scoped authorization for staff
 * - Order status synchronization via OrderService
 * - Strict inventory bounds (never duplicates inventory consumption)
 */

import { fulfillmentRepository } from "../repositories/fulfillment.repository";
import { shippingProviderService } from "./shipping-provider.service";
import { warehouseAllocationService } from "@/modules/inventory/services/warehouse-allocation.service";
import { warehouseRepository } from "@/modules/inventory/repositories/warehouse.repository";
import { orderService } from "@/modules/orders/services/order.service";
import { OrderModel, WarehouseModel } from "@/db/models";
import {
  assertValidFulfillmentTransition,
  isCancellableFulfillmentState,
} from "../state-machine/fulfillment-state-machine";
import {
  FulfillmentStatus,
  ShipmentStatus,
  ShipmentEventSource,
  OrderStatus,
  WarehouseStatus,
} from "@/constants/status";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  IFulfillment,
  IFulfillmentItem,
  IPackage,
  IShipment,
  IStaff,
} from "@/types/database";
import {
  FulfillmentDTO,
  PackageDTO,
  ShipmentDTO,
  CreateFulfillmentInput,
  ConfirmPickInput,
  CreatePackageInput,
  CreateShipmentInput,
  FulfillmentFilterOptions,
} from "../types/fulfillment.types";

export class FulfillmentService {
  /**
   * Helper: Enforces server-side warehouse scoping for warehouse staff.
   */
  assertWarehouseScope(warehouseId: string, staff?: IStaff): void {
    if (!staff) return;
    if (staff.assignedWarehouseId && staff.assignedWarehouseId.toString() !== warehouseId) {
      throw new AuthorizationError(
        `Warehouse scope violation: Staff is restricted to warehouse ${staff.assignedWarehouseId}`
      );
    }
  }

  // ── 1. Create Fulfillment ─────────────────────────────────────────────────

  /**
   * Create a fulfillment order for an existing confirmed/processing order.
   * Leverages Phase 20's WarehouseAllocationService if warehouseId is not explicitly provided.
   */
  async createFulfillment(
    input: CreateFulfillmentInput,
    actorStaff?: IStaff
  ): Promise<FulfillmentDTO> {
    const { orderId } = input;

    const order = await OrderModel.findById(orderId).lean();
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Only confirmed, processing, or packed orders can have fulfillments created
    const eligibleOrderStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.PACKED,
    ];
    if (!eligibleOrderStatuses.includes(order.status)) {
      throw new ConflictError(
        `Cannot fulfill order in ${order.status} status. Must be CONFIRMED or PROCESSING.`
      );
    }

    // Check existing fulfillments to prevent over-fulfillment
    const existingFulfillments = await fulfillmentRepository.findFulfillmentsByOrderId(orderId);
    const activeFulfillments = existingFulfillments.filter(
      (f) => f.status !== FulfillmentStatus.CANCELLED && f.status !== FulfillmentStatus.FAILED
    );

    // Sum fulfilled or in-progress quantities across all existing active fulfillments
    const allocatedByVariant = new Map<string, number>();
    for (const f of activeFulfillments) {
      for (const item of f.items) {
        allocatedByVariant.set(
          item.variantId,
          (allocatedByVariant.get(item.variantId) || 0) + item.orderedQuantity
        );
      }
    }

    // Determine unfulfilled items
    const unfulfilledItems: IFulfillmentItem[] = [];
    for (const orderItem of order.items) {
      const alreadyAllocated = allocatedByVariant.get(orderItem.variantId) || 0;
      const remainingToFulfill = orderItem.quantity - alreadyAllocated;

      if (remainingToFulfill > 0) {
        unfulfilledItems.push({
          orderItemId: (orderItem as any)._id ? (orderItem as any)._id.toString() : orderItem.variantId,
          productId: orderItem.productId,
          variantId: orderItem.variantId,
          sku: orderItem.sku,
          productName: orderItem.productName,
          color: orderItem.color,
          size: orderItem.size,
          orderedQuantity: remainingToFulfill,
          fulfilledQuantity: 0,
        });
      }
    }

    if (unfulfilledItems.length === 0) {
      throw new ConflictError("All items in this order are already covered by active fulfillments.");
    }

    // Resolve destination warehouse
    let targetWarehouseId = input.warehouseId;
    if (targetWarehouseId) {
      this.assertWarehouseScope(targetWarehouseId, actorStaff);
      const warehouse = await warehouseRepository.findById(targetWarehouseId);
      if (!warehouse || warehouse.status !== WarehouseStatus.ACTIVE) {
        throw new NotFoundError("Specified warehouse is not active or does not exist");
      }
    } else {
      // Deterministically allocate via Phase 20 WarehouseAllocationService
      const allocationItems = unfulfilledItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.orderedQuantity,
      }));

      const allocation = await warehouseAllocationService.allocate(
        allocationItems,
        order.shippingAddress?.pincode
      );

      const firstAlloc = allocation.allocations[0];
      if (allocation.success && firstAlloc) {
        // Use primary warehouse from allocation
        targetWarehouseId = firstAlloc.warehouseId;
      } else {
        // Fallback to first active warehouse if allocation couldn't resolve
        const activeWarehouses = await warehouseRepository.findActiveWarehouses();
        const firstWarehouse = activeWarehouses[0];
        if (!firstWarehouse) {
          throw new ConflictError("No active warehouses available for fulfillment");
        }
        targetWarehouseId = firstWarehouse._id.toString();
      }
    }

    const initialStatus = targetWarehouseId
      ? FulfillmentStatus.ALLOCATED
      : FulfillmentStatus.READY_FOR_FULFILLMENT;

    const fulfillment = await fulfillmentRepository.createFulfillment({
      orderId: order._id.toString(),
      warehouseId: targetWarehouseId,
      status: initialStatus,
      items: unfulfilledItems,
      allocatedAt: targetWarehouseId ? new Date() : undefined,
    });

    logger.info("Fulfillment created", {
      context: "FulfillmentService",
      metadata: {
        fulfillmentNumber: fulfillment.fulfillmentNumber,
        orderId: order._id.toString(),
        warehouseId: targetWarehouseId,
        itemCount: unfulfilledItems.length,
      },
    });

    // Synchronize order state: if CONFIRMED, transition to PROCESSING
    if (order.status === OrderStatus.CONFIRMED) {
      try {
        await orderService.updateOrderStatusAsAdmin(
          order._id.toString(),
          actorStaff?.email || "SYSTEM",
          OrderStatus.PROCESSING,
          `Fulfillment ${fulfillment.fulfillmentNumber} initiated`
        );
      } catch (err) {
        logger.warn("Could not transition order to PROCESSING", {
          context: "FulfillmentService",
          metadata: { orderId: order._id.toString(), error: String(err) },
        });
      }
    }

    return this.mapFulfillmentToDTO(fulfillment);
  }

  // ── 2. Allocate Fulfillment ───────────────────────────────────────────────

  /**
   * Explicitly allocate a fulfillment to a specific warehouse.
   */
  async allocate(
    fulfillmentId: string,
    warehouseId: string,
    actorStaff?: IStaff
  ): Promise<FulfillmentDTO> {
    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    assertValidFulfillmentTransition(fulfillment.status, FulfillmentStatus.ALLOCATED);
    this.assertWarehouseScope(warehouseId, actorStaff);

    const warehouse = await warehouseRepository.findById(warehouseId);
    if (!warehouse || warehouse.status !== WarehouseStatus.ACTIVE) {
      throw new NotFoundError("Target warehouse is not active or does not exist");
    }

    const updated = await fulfillmentRepository.updateFulfillment(fulfillmentId, {
      warehouseId,
      status: FulfillmentStatus.ALLOCATED,
      allocatedAt: new Date(),
    });

    return this.mapFulfillmentToDTO(updated!);
  }

  // ── 3. Pick Operations ────────────────────────────────────────────────────

  /**
   * Start the picking phase. Transitions fulfillment to PICKING.
   */
  async startPicking(fulfillmentId: string, actorStaff?: IStaff): Promise<FulfillmentDTO> {
    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    assertValidFulfillmentTransition(fulfillment.status, FulfillmentStatus.PICKING);
    this.assertWarehouseScope(fulfillment.warehouseId, actorStaff);

    const actor = actorStaff?.email || "WAREHOUSE_STAFF";
    const updated = await fulfillmentRepository.updateFulfillment(fulfillmentId, {
      status: FulfillmentStatus.PICKING,
      pickingStartedAt: new Date(),
      pickedBy: actor,
    });

    logger.info("Picking started", {
      context: "FulfillmentService",
      metadata: { fulfillmentId, actor },
    });

    return this.mapFulfillmentToDTO(updated!);
  }

  /**
   * Confirm picked items. Validates quantities against ordered quantities and transitions to PICKED.
   */
  async confirmPick(input: ConfirmPickInput, actorStaff?: IStaff): Promise<FulfillmentDTO> {
    const { fulfillmentId, pickedItems } = input;

    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    assertValidFulfillmentTransition(fulfillment.status, FulfillmentStatus.PICKED);
    this.assertWarehouseScope(fulfillment.warehouseId, actorStaff);

    // Validate picked items against fulfillment items
    const pickedMap = new Map(pickedItems.map((p) => [p.orderItemId, p.quantity]));
    const updatedItems: IFulfillmentItem[] = fulfillment.items.map((item) => {
      const pickedQty = pickedMap.get(item.orderItemId) ?? item.fulfilledQuantity;
      if (pickedQty > item.orderedQuantity) {
        throw new ValidationError(
          `Picked quantity (${pickedQty}) exceeds ordered quantity (${item.orderedQuantity}) for item ${item.sku}`
        );
      }
      return {
        ...item,
        fulfilledQuantity: pickedQty,
      };
    });

    const actor = actorStaff?.email || input.actor;
    const updated = await fulfillmentRepository.updateFulfillment(fulfillmentId, {
      status: FulfillmentStatus.PICKED,
      items: updatedItems,
      pickedAt: new Date(),
      pickedBy: actor,
    });

    logger.info("Picking confirmed", {
      context: "FulfillmentService",
      metadata: { fulfillmentId, actor, itemsCount: updatedItems.length },
    });

    return this.mapFulfillmentToDTO(updated!);
  }

  // ── 4. Pack Operations & Package Creation ─────────────────────────────────

  /**
   * Start packing phase. Transitions fulfillment to PACKING.
   */
  async startPacking(fulfillmentId: string, actorStaff?: IStaff): Promise<FulfillmentDTO> {
    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    assertValidFulfillmentTransition(fulfillment.status, FulfillmentStatus.PACKING);
    this.assertWarehouseScope(fulfillment.warehouseId, actorStaff);

    const actor = actorStaff?.email || "WAREHOUSE_STAFF";
    const updated = await fulfillmentRepository.updateFulfillment(fulfillmentId, {
      status: FulfillmentStatus.PACKING,
      packingStartedAt: new Date(),
      packedBy: actor,
    });

    logger.info("Packing started", {
      context: "FulfillmentService",
      metadata: { fulfillmentId, actor },
    });

    return this.mapFulfillmentToDTO(updated!);
  }

  /**
   * Create a physical package for a fulfillment order.
   * Validates that packed items are within the fulfillment's items bounds.
   */
  async createPackage(input: CreatePackageInput, actorStaff?: IStaff): Promise<PackageDTO> {
    const { fulfillmentId, items, weightGrams, lengthMm, widthMm, heightMm } = input;

    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    if (
      fulfillment.status !== FulfillmentStatus.PACKING &&
      fulfillment.status !== FulfillmentStatus.PICKED
    ) {
      throw new ConflictError(
        `Cannot create package for fulfillment in ${fulfillment.status} status. Must be in PICKED or PACKING status.`
      );
    }

    this.assertWarehouseScope(fulfillment.warehouseId, actorStaff);

    // Validate items in package against fulfillment items
    const fulfillmentItemMap = new Map(fulfillment.items.map((i) => [i.orderItemId, i]));
    for (const pkgItem of items) {
      const fItem = fulfillmentItemMap.get(pkgItem.orderItemId);
      if (!fItem) {
        throw new ValidationError(`Order item ${pkgItem.orderItemId} is not in this fulfillment`);
      }
      if (pkgItem.quantity > fItem.orderedQuantity) {
        throw new ValidationError(
          `Package item quantity (${pkgItem.quantity}) exceeds ordered quantity (${fItem.orderedQuantity}) for ${pkgItem.sku}`
        );
      }
    }

    const pkg = await fulfillmentRepository.createPackage({
      fulfillmentId,
      orderId: fulfillment.orderId,
      items,
      weightGrams,
      lengthMm,
      widthMm,
      heightMm,
      status: "CREATED",
    });

    logger.info("Package created", {
      context: "FulfillmentService",
      metadata: { packageNumber: pkg.packageNumber, fulfillmentId, weightGrams },
    });

    return this.mapPackageToDTO(pkg);
  }

  /**
   * Finalize packing. Validates that packages exist and transitions fulfillment to PACKED.
   * Also synchronizes the order status to PACKED.
   */
  async confirmPack(fulfillmentId: string, actorStaff?: IStaff): Promise<FulfillmentDTO> {
    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    assertValidFulfillmentTransition(fulfillment.status, FulfillmentStatus.PACKED);
    this.assertWarehouseScope(fulfillment.warehouseId, actorStaff);

    // Verify at least one package exists
    const packages = await fulfillmentRepository.findPackagesByFulfillmentId(fulfillmentId);
    if (packages.length === 0) {
      throw new ValidationError("Cannot complete packing: At least one package must be created.");
    }

    const actor = actorStaff?.email || "WAREHOUSE_STAFF";
    const updated = await fulfillmentRepository.updateFulfillment(fulfillmentId, {
      status: FulfillmentStatus.PACKED,
      packedAt: new Date(),
      packedBy: actor,
    });

    // Seal all packages for this fulfillment
    for (const pkg of packages) {
      if (pkg.status === "CREATED") {
        await fulfillmentRepository.updatePackage(pkg._id.toString(), { status: "SEALED" });
      }
    }

    // Synchronize order state to PACKED
    try {
      await orderService.updateOrderStatusAsAdmin(
        fulfillment.orderId,
        actor,
        OrderStatus.PACKED,
        `Fulfillment ${fulfillment.fulfillmentNumber} packed`
      );
    } catch (err) {
      logger.warn("Could not transition order to PACKED", {
        context: "FulfillmentService",
        metadata: { orderId: fulfillment.orderId, error: String(err) },
      });
    }

    logger.info("Packing confirmed", {
      context: "FulfillmentService",
      metadata: { fulfillmentId, actor, packageCount: packages.length },
    });

    return this.mapFulfillmentToDTO(updated!);
  }

  // ── 5. Shipment Creation ──────────────────────────────────────────────────

  /**
   * Create a shipment for a packed package via the active shipping provider.
   * Enforces idempotency via idempotencyKey.
   */
  async createShipment(input: CreateShipmentInput, actorStaff?: IStaff): Promise<ShipmentDTO> {
    const { fulfillmentId, packageId, serviceLevel, idempotencyKey } = input;

    // 1. Check idempotency
    if (idempotencyKey) {
      const existing = await fulfillmentRepository.findShipmentByIdempotencyKey(idempotencyKey);
      if (existing) {
        logger.info("Returning existing shipment for idempotency key", {
          context: "FulfillmentService",
          metadata: { idempotencyKey, shipmentNumber: existing.shipmentNumber },
        });
        return this.mapShipmentToDTO(existing);
      }
    }

    // 2. Validate fulfillment & package
    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    if (
      fulfillment.status !== FulfillmentStatus.PACKED &&
      fulfillment.status !== FulfillmentStatus.SHIPMENT_CREATED
    ) {
      throw new ConflictError(
        `Cannot create shipment for fulfillment in ${fulfillment.status} status. Must be PACKED.`
      );
    }

    this.assertWarehouseScope(fulfillment.warehouseId, actorStaff);

    const pkg = await fulfillmentRepository.findPackageById(packageId);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }
    if (pkg.fulfillmentId !== fulfillmentId) {
      throw new ConflictError("Package does not belong to this fulfillment");
    }

    const order = await OrderModel.findById(fulfillment.orderId).lean();
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const shippingAddress = order.shippingAddress;
    if (!shippingAddress) {
      throw new ValidationError("Order does not have a valid shipping address");
    }

    // 3. Resolve active shipping provider
    const provider = shippingProviderService.getActiveProvider();
    const shipmentNumber = fulfillmentRepository.generateShipmentNumber();

    // 4. Request shipment creation from provider
    const providerResponse = await provider.createShipment({
      orderId: order._id.toString(),
      shipmentNumber,
      warehouseId: fulfillment.warehouseId,
      recipientName: shippingAddress.fullName,
      recipientPhone: shippingAddress.phone,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      country: shippingAddress.country,
      pincode: shippingAddress.pincode,
      weightGrams: pkg.weightGrams,
      lengthMm: pkg.lengthMm,
      widthMm: pkg.widthMm,
      heightMm: pkg.heightMm,
      serviceLevel,
      idempotencyKey,
    });

    if (!providerResponse.success) {
      throw new ConflictError(
        providerResponse.error || "Shipping provider failed to create shipment"
      );
    }

    // Initial shipment status depends on whether AWB/label was issued
    const initialShipmentStatus = providerResponse.awbNumber
      ? ShipmentStatus.LABEL_CREATED
      : ShipmentStatus.CREATED;

    // 5. Persist shipment record
    const shipment = await fulfillmentRepository.createShipment({
      shipmentNumber,
      orderId: order._id.toString(),
      fulfillmentId,
      packageId,
      warehouseId: fulfillment.warehouseId,
      provider: provider.name,
      providerShipmentId: providerResponse.providerShipmentId,
      awbNumber: providerResponse.awbNumber,
      trackingUrl: providerResponse.trackingUrl,
      status: initialShipmentStatus,
      serviceLevel,
      estimatedDeliveryDate: providerResponse.estimatedDeliveryDate
        ? new Date(providerResponse.estimatedDeliveryDate)
        : undefined,
      idempotencyKey,
    });

    // 6. Record creation event in audit trail
    await fulfillmentRepository.recordShipmentEvent({
      shipmentId: shipment._id.toString(),
      status: initialShipmentStatus,
      description: `Shipment created via ${provider.name}`,
      source: ShipmentEventSource.SYSTEM,
      location: "Warehouse Dispatch",
    });

    // 7. Update package status to LABELLED
    await fulfillmentRepository.updatePackage(packageId, { status: "LABELLED" });

    // 8. Update fulfillment status to SHIPMENT_CREATED
    await fulfillmentRepository.updateFulfillment(fulfillmentId, {
      status: FulfillmentStatus.SHIPMENT_CREATED,
    });

    // 9. Update order's primary shipmentId if not already set
    if (!order.shipmentId) {
      await OrderModel.findByIdAndUpdate(order._id, {
        $set: { shipmentId: shipment._id.toString() },
      });
    }

    logger.info("Shipment created successfully", {
      context: "FulfillmentService",
      metadata: {
        shipmentNumber: shipment.shipmentNumber,
        provider: provider.name,
        awbNumber: shipment.awbNumber,
      },
    });

    return this.mapShipmentToDTO(shipment);
  }

  // ── 6. Cancellation ───────────────────────────────────────────────────────

  /**
   * Cancel fulfillment if in an eligible pre-operational state.
   */
  async cancelFulfillment(
    fulfillmentId: string,
    reason: string,
    actorStaff?: IStaff
  ): Promise<FulfillmentDTO> {
    const fulfillment = await fulfillmentRepository.findFulfillmentById(fulfillmentId);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    if (!isCancellableFulfillmentState(fulfillment.status)) {
      throw new ConflictError(
        `Cannot cancel fulfillment in ${fulfillment.status} status. Fulfillment is already in progress.`
      );
    }

    this.assertWarehouseScope(fulfillment.warehouseId, actorStaff);

    const actor = actorStaff?.email || "SYSTEM";
    const updated = await fulfillmentRepository.updateFulfillment(fulfillmentId, {
      status: FulfillmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actor,
      cancellationReason: reason,
    });

    logger.info("Fulfillment cancelled", {
      context: "FulfillmentService",
      metadata: { fulfillmentId, reason, actor },
    });

    return this.mapFulfillmentToDTO(updated!);
  }

  // ── 7. Queries & Mappings ─────────────────────────────────────────────────

  async getFulfillmentById(id: string): Promise<FulfillmentDTO> {
    const fulfillment = await fulfillmentRepository.findFulfillmentById(id);
    if (!fulfillment) {
      throw new NotFoundError("Fulfillment not found");
    }

    const warehouse = await warehouseRepository.findById(fulfillment.warehouseId);
    return this.mapFulfillmentToDTO(fulfillment, warehouse?.code);
  }

  async getFulfillmentsByOrderId(orderId: string): Promise<FulfillmentDTO[]> {
    const fulfillments = await fulfillmentRepository.findFulfillmentsByOrderId(orderId);
    return fulfillments.map((f) => this.mapFulfillmentToDTO(f));
  }

  async listFulfillments(
    filters: FulfillmentFilterOptions,
    pagination: { page?: number; limit?: number } = {},
    actorStaff?: IStaff
  ): Promise<{
    items: FulfillmentDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // If staff is restricted to a warehouse, enforce it in query
    const effectiveFilters = { ...filters };
    if (actorStaff?.assignedWarehouseId) {
      effectiveFilters.warehouseId = actorStaff.assignedWarehouseId.toString();
    }

    const paginated = await fulfillmentRepository.findFulfillments(effectiveFilters, pagination);
    const items = paginated.items.map((f) => this.mapFulfillmentToDTO(f));

    return {
      ...paginated,
      items,
    };
  }

  async getFulfillmentStats(
    warehouseId?: string,
    actorStaff?: IStaff
  ): Promise<Record<string, number>> {
    const effectiveWarehouseId = actorStaff?.assignedWarehouseId
      ? actorStaff.assignedWarehouseId.toString()
      : warehouseId;

    return fulfillmentRepository.countFulfillmentsByStatus(effectiveWarehouseId);
  }

  async getPackagesByFulfillmentId(fulfillmentId: string): Promise<PackageDTO[]> {
    const pkgs = await fulfillmentRepository.findPackagesByFulfillmentId(fulfillmentId);
    return pkgs.map((p) => this.mapPackageToDTO(p));
  }

  // ── Private Mappers ───────────────────────────────────────────────────────

  private mapFulfillmentToDTO(f: IFulfillment, warehouseCode?: string): FulfillmentDTO {
    return {
      id: f._id.toString(),
      fulfillmentNumber: f.fulfillmentNumber,
      orderId: f.orderId,
      warehouseId: f.warehouseId,
      warehouseCode,
      status: f.status,
      items: f.items.map((i) => ({
        orderItemId: i.orderItemId,
        productId: i.productId,
        variantId: i.variantId,
        sku: i.sku,
        productName: i.productName,
        color: i.color,
        size: i.size,
        orderedQuantity: i.orderedQuantity,
        fulfilledQuantity: i.fulfilledQuantity,
      })),
      assignedTo: f.assignedTo,
      allocatedAt: f.allocatedAt?.toISOString(),
      pickedAt: f.pickedAt?.toISOString(),
      pickedBy: f.pickedBy,
      packedAt: f.packedAt?.toISOString(),
      packedBy: f.packedBy,
      completedAt: f.completedAt?.toISOString(),
      cancelledAt: f.cancelledAt?.toISOString(),
      createdAt: f.createdAt ? f.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: f.updatedAt ? f.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private mapPackageToDTO(p: IPackage): PackageDTO {
    return {
      id: p._id.toString(),
      packageNumber: p.packageNumber,
      fulfillmentId: p.fulfillmentId,
      orderId: p.orderId,
      items: p.items.map((i) => ({
        orderItemId: i.orderItemId,
        variantId: i.variantId,
        sku: i.sku,
        quantity: i.quantity,
      })),
      weightGrams: p.weightGrams,
      lengthMm: p.lengthMm,
      widthMm: p.widthMm,
      heightMm: p.heightMm,
      status: p.status,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private mapShipmentToDTO(s: IShipment): ShipmentDTO {
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
      createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: s.updatedAt ? s.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const fulfillmentService = new FulfillmentService();
