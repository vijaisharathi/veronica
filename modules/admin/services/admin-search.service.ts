/**
 * VÉRONA — Admin Global Cross-Domain Search Service (Phase 27)
 *
 * Implements permission-aware, server-side federated search across:
 * Orders, Products, Customers, Payments, Refunds, Returns, Reviews, and Support Tickets.
 * Never returns documents or sensitive metadata for domains the staff member is unauthorized to view.
 */

import { connectToDatabase } from "@/db/client";
import {
  OrderModel,
  ProductModel,
  ProductVariantModel,
  CustomerModel,
  PaymentModel,
  RefundModel,
  ReturnRequestModel,
  SupportTicketModel,
  ReviewModel,
} from "@/db/models";
import { Permission, PERMISSIONS } from "@/constants/permissions";
import { AdminSearchResultDTO } from "../types/admin.types";

export class AdminSearchService {
  /**
   * Executes federated search across permitted domains.
   */
  async search(
    query: string,
    permissions: Permission[],
    assignedWarehouseId?: string
  ): Promise<AdminSearchResultDTO[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    await connectToDatabase();

    const term = query.trim();
    const regex = new RegExp(term, "i");
    const results: AdminSearchResultDTO[] = [];
    const searchPromises: Promise<void>[] = [];

    // 1. Orders Search (Guarded by ORDERS_READ)
    if (permissions.includes(PERMISSIONS.ORDERS_READ) || permissions.includes(PERMISSIONS.ORDERS_READ_LIMITED)) {
      searchPromises.push(
        (async () => {
          try {
            const orders = await OrderModel.find({
              $or: [
                { orderNumber: regex },
                { "customer.email": regex },
                { "customer.name": regex },
              ],
            })
              .limit(5)
              .select("orderNumber status customer createdAt")
              .lean();

            for (const order of orders) {
              results.push({
                type: "ORDER",
                reference: order.orderNumber,
                title: `Order #${order.orderNumber}`,
                subtitle: `${(order as any).customer?.name || "Customer"} — Status: ${order.status}`,
                status: order.status,
                href: `/admin/orders?search=${encodeURIComponent(order.orderNumber)}`,
                updatedAt: (order as any).createdAt?.toISOString?.() || String((order as any).createdAt),
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    // 2. Products & Variants (Guarded by PRODUCTS_READ or INVENTORY_READ)
    if (permissions.includes(PERMISSIONS.PRODUCTS_READ) || permissions.includes(PERMISSIONS.INVENTORY_READ)) {
      searchPromises.push(
        (async () => {
          try {
            const [products, variants] = await Promise.all([
              ProductModel.find({ name: regex, isDeleted: false })
                .limit(4)
                .select("name slug categoryId")
                .lean(),
              ProductVariantModel.find({ sku: regex, isActive: true })
                .limit(4)
                .select("sku title productId inventory")
                .lean(),
            ]);

            for (const p of products) {
              results.push({
                type: "PRODUCT",
                reference: p.slug,
                title: p.name,
                subtitle: "Product Catalog",
                href: `/admin/products?search=${encodeURIComponent(p.name)}`,
              });
            }

            for (const v of variants) {
              results.push({
                type: "PRODUCT",
                reference: v.sku,
                title: `SKU: ${v.sku}`,
                subtitle: `Variant: ${(v as any).title || v.sku} — Available: ${(v as any).inventory?.availableStock ?? 0}`,
                href: `/admin/inventory?search=${encodeURIComponent(v.sku)}`,
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    // 3. Customers (Guarded by CUSTOMERS_READ)
    if (permissions.includes(PERMISSIONS.CUSTOMERS_READ)) {
      searchPromises.push(
        (async () => {
          try {
            const customers = await CustomerModel.find({
              $or: [
                { email: regex },
                { firstName: regex },
                { lastName: regex },
                { phone: regex },
              ],
              isDeleted: false,
            })
              .limit(4)
              .select("firstName lastName displayName email status")
              .lean();

            for (const c of customers) {
              const name = (c as any).displayName || `${(c as any).firstName || ""} ${(c as any).lastName || ""}`.trim() || c.email;
              results.push({
                type: "CUSTOMER",
                reference: c.email,
                title: name,
                subtitle: `Customer — ${c.email}`,
                status: (c as any).status,
                href: `/admin/customers?search=${encodeURIComponent(c.email)}`,
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    // 4. Payments (Guarded by PAYMENTS_READ)
    if (permissions.includes(PERMISSIONS.PAYMENTS_READ)) {
      searchPromises.push(
        (async () => {
          try {
            const payments = await PaymentModel.find({
              $or: [
                { providerOrderId: regex },
                { providerPaymentId: regex },
                { checkoutSessionId: regex },
              ],
            })
              .limit(4)
              .select("providerOrderId providerPaymentId status amount currency createdAt")
              .lean();

            for (const pay of payments) {
              results.push({
                type: "PAYMENT",
                reference: (pay as any).providerOrderId || pay._id.toString(),
                title: `Payment ${(pay as any).providerPaymentId || (pay as any).providerOrderId || pay._id.toString()}`,
                subtitle: `Status: ${pay.status} — Provider: ${(pay as any).provider || "Razorpay"}`,
                status: pay.status,
                href: `/admin/payments?search=${encodeURIComponent((pay as any).providerOrderId || pay._id.toString())}`,
                updatedAt: (pay as any).createdAt?.toISOString?.() || String((pay as any).createdAt),
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    // 5. Refunds (Guarded by REFUNDS_READ)
    if (permissions.includes(PERMISSIONS.REFUNDS_READ)) {
      searchPromises.push(
        (async () => {
          try {
            const refunds = await RefundModel.find({
              $or: [
                { refundNumber: regex },
                { gatewayRefundId: regex },
              ],
            })
              .limit(4)
              .select("refundNumber status amount createdAt")
              .lean();

            for (const ref of refunds) {
              results.push({
                type: "REFUND",
                reference: ref.refundNumber,
                title: `Refund #${ref.refundNumber}`,
                subtitle: `Status: ${ref.status}`,
                status: ref.status,
                href: `/admin/refunds?search=${encodeURIComponent(ref.refundNumber)}`,
                updatedAt: (ref as any).createdAt?.toISOString?.() || String((ref as any).createdAt),
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    // 6. Returns & Exchanges (Guarded by RETURNS_READ)
    if (permissions.includes(PERMISSIONS.RETURNS_READ)) {
      searchPromises.push(
        (async () => {
          try {
            const returns = await ReturnRequestModel.find({
              $or: [
                { returnNumber: regex },
              ],
            })
              .limit(4)
              .select("returnNumber status type createdAt")
              .lean();

            for (const ret of returns) {
              results.push({
                type: "RETURN",
                reference: ret.returnNumber,
                title: `${ret.type === "EXCHANGE" ? "Exchange" : "Return"} #${ret.returnNumber}`,
                subtitle: `Status: ${ret.status}`,
                status: ret.status,
                href: `/admin/returns?search=${encodeURIComponent(ret.returnNumber)}`,
                updatedAt: (ret as any).createdAt?.toISOString?.() || String((ret as any).createdAt),
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    // 7. Support Tickets (Guarded by SUPPORT_READ)
    if (permissions.includes(PERMISSIONS.SUPPORT_READ)) {
      searchPromises.push(
        (async () => {
          try {
            const tickets = await SupportTicketModel.find({
              $or: [
                { ticketNumber: regex },
                { subject: regex },
              ],
            })
              .limit(4)
              .select("ticketNumber subject status priority createdAt")
              .lean();

            for (const ticket of tickets) {
              results.push({
                type: "TICKET",
                reference: ticket.ticketNumber,
                title: `Ticket #${ticket.ticketNumber}`,
                subtitle: `${ticket.subject} — [${ticket.priority}]`,
                status: ticket.status,
                href: `/admin/support/${ticket.ticketNumber}`,
                updatedAt: (ticket as any).createdAt?.toISOString?.() || String((ticket as any).createdAt),
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    // 8. Reviews (Guarded by REVIEWS_READ)
    if (permissions.includes(PERMISSIONS.REVIEWS_READ)) {
      searchPromises.push(
        (async () => {
          try {
            const reviews = await ReviewModel.find({
              $or: [
                { title: regex },
                { content: regex },
              ],
            })
              .limit(4)
              .select("title rating status createdAt")
              .lean();

            for (const review of reviews) {
              results.push({
                type: "REVIEW",
                reference: review._id.toString(),
                title: review.title || "Product Review",
                subtitle: `Rating: ${review.rating}★ — Status: ${review.status}`,
                status: review.status,
                href: `/admin/reviews?search=${encodeURIComponent(review.title || "")}`,
                updatedAt: (review as any).createdAt?.toISOString?.() || String((review as any).createdAt),
              });
            }
          } catch {
            // Isolate search failures
          }
        })()
      );
    }

    await Promise.all(searchPromises);

    // Limit maximum total federated results to 25 items
    return results.slice(0, 25);
  }
}

export const adminSearchService = new AdminSearchService();
