/**
 * VÉRONA — Domain Service Interface Foundations
 *
 * Defines architectural contracts for future domain services without premature business implementations.
 * Full business flows (pricing calculators, payment handshakes, inventory locking) will be implemented in subsequent phases.
 */

import {
  ICustomer,
  IProduct,
  IProductVariant,
  ICart,
  IOrder,
  IPayment,
  IInventoryItem,
} from "./database";
import { PaginatedResult } from "./index";
import { ProductQueryFilters, PaginationOptions } from "@/db/repositories/product.repository";

export interface ICatalogService {
  getProductBySlug(slug: string): Promise<IProduct | null>;
  listProducts(filters: ProductQueryFilters, pagination: PaginationOptions): Promise<PaginatedResult<IProduct>>;
  getProductVariants(productId: string): Promise<IProductVariant[]>;
}

export interface IInventoryService {
  checkStockAvailability(variantId: string, quantity: number): Promise<boolean>;
  getVariantStock(variantId: string): Promise<number>;
  getWarehouseInventory(warehouseId: string, variantId: string): Promise<IInventoryItem | null>;
}

export interface ICartService {
  getCartForCustomer(customerId: string): Promise<ICart | null>;
  getCartForSession(sessionId: string): Promise<ICart | null>;
}

export interface IOrderService {
  getOrderByNumber(orderNumber: string): Promise<IOrder | null>;
  getCustomerOrders(customerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<IOrder>>;
}

export interface IPaymentService {
  getPaymentById(paymentId: string): Promise<IPayment | null>;
}

export interface ICustomerService {
  getCustomerProfile(customerId: string): Promise<ICustomer | null>;
  getCustomerByAuthId(authProviderId: string): Promise<ICustomer | null>;
}
