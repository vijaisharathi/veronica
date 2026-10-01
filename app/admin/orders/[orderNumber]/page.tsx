import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { orderRepository } from "@/modules/orders/repositories/order.repository";
import { orderService } from "@/modules/orders/services/order.service";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Details | VÉRONA Admin",
  description: "Authoritative order snapshot, fulfillment progress, and audit timeline",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requirePermission(PERMISSIONS.ORDERS_READ);
  const { orderNumber } = await params;

  const orderDoc = await orderRepository.findByOrderNumber(orderNumber);
  if (!orderDoc) {
    notFound();
  }

  const order = await orderService.getAdminOrderById(orderDoc._id.toString());

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <span className="font-mono text-xs text-neutral-400">ID: {order.id}</span>
      </div>

      <div className="border border-border rounded bg-background p-6 space-y-6 shadow-subtle">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded">
              <ShoppingBag className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-foreground">
                  #{order.orderNumber}
                </h1>
                <span className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 rounded">
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Placed on {new Date(order.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Grand Total</span>
            <span className="text-xl font-bold text-foreground">
              {formatMoney(order.pricing.totalMinor)}
            </span>
          </div>
        </div>

        {/* Customer & Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 border border-border rounded bg-neutral-50/50 dark:bg-neutral-950/40 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              Customer Information
            </span>
            <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
            <p className="text-neutral-500">{order.email}</p>
            {order.phone && (
              <p className="text-neutral-500 font-mono">{order.phone}</p>
            )}
          </div>

          <div className="p-4 border border-border rounded bg-neutral-50/50 dark:bg-neutral-950/40 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              Delivery Destination
            </span>
            <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
            <p className="text-neutral-500">
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
            </p>
            <p className="text-neutral-500">
              {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
            </p>
          </div>
        </div>

        {/* Purchased Items */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Purchased Garments ({order.items.length})
          </h2>
          <div className="divide-y divide-border border border-border rounded overflow-hidden">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-foreground">{item.productName}</p>
                  <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                    SKU: {item.sku} • Size: {item.size} • Color: {item.color} • Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-medium text-foreground">
                    {formatMoney(item.finalPriceMinor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="p-4 border border-border rounded bg-neutral-50/50 dark:bg-neutral-950/40 space-y-2 text-xs font-mono max-w-sm ml-auto">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal:</span>
            <span>{formatMoney(order.pricing.subtotalMinor)}</span>
          </div>
          {order.pricing.discountMinor > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount:</span>
              <span>-{formatMoney(order.pricing.discountMinor)}</span>
            </div>
          )}
          <div className="flex justify-between text-neutral-500">
            <span>Shipping Fee:</span>
            <span>{formatMoney(order.pricing.shippingMinor)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Estimated Tax:</span>
            <span>{formatMoney(order.pricing.taxMinor)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground text-sm">
            <span>Total:</span>
            <span>{formatMoney(order.pricing.totalMinor)}</span>
          </div>
        </div>

        {/* Audit Status Timeline */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Audit Status Timeline
          </h2>
          <div className="border border-border rounded p-4 space-y-3 text-xs bg-background">
            {order.timeline.map((step, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      step.completed ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  />
                  <span className={step.completed ? "font-medium text-foreground" : "text-neutral-400"}>
                    {step.label}
                  </span>
                </div>
                {step.timestamp && (
                  <span className="font-mono text-[11px] text-neutral-400">
                    {new Date(step.timestamp).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
