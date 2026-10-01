"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  Bookmark,
  FileText,
  Warehouse,
  ShoppingBag,
  Users,
  RotateCcw,
  Receipt,
  Sparkles,
  LifeBuoy,
  BarChart3,
  ShieldAlert,
  Settings,
  History,
  Store,
  Truck,
  LogOut,
  Star,
  Bell,
  CreditCard,
} from "lucide-react";
import { PERMISSIONS, Permission } from "@/constants/permissions";
import { usePermissions } from "@/components/auth/permission-gate";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

const ALL_ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package,
    permission: PERMISSIONS.PRODUCTS_READ,
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: Layers,
    permission: PERMISSIONS.CATEGORIES_READ,
  },
  {
    label: "Collections",
    href: "/admin/collections",
    icon: Boxes,
    permission: PERMISSIONS.COLLECTIONS_READ,
  },
  {
    label: "Brands",
    href: "/admin/brands",
    icon: Bookmark,
    permission: PERMISSIONS.BRANDS_READ,
  },
  {
    label: "Content Hub",
    href: "/admin/content",
    icon: FileText,
    permission: PERMISSIONS.CONTENT_READ,
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
    permission: PERMISSIONS.INVENTORY_READ,
  },
  {
    label: "Warehouses",
    href: "/admin/warehouses",
    icon: Store,
    permission: PERMISSIONS.WAREHOUSES_READ,
  },
  {
    label: "Fulfillment",
    href: "/admin/fulfillment",
    icon: Truck,
    permission: PERMISSIONS.FULFILLMENT_READ,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    permission: PERMISSIONS.ORDERS_READ,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
    permission: PERMISSIONS.PAYMENTS_READ,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
    permission: PERMISSIONS.CUSTOMERS_READ,
  },
  {
    label: "Returns",
    href: "/admin/returns",
    icon: RotateCcw,
    permission: PERMISSIONS.RETURNS_READ,
  },
  {
    label: "Refunds",
    href: "/admin/refunds",
    icon: Receipt,
    permission: PERMISSIONS.REFUNDS_READ,
  },
  {
    label: "Reviews",
    href: "/admin/reviews",
    icon: Star,
    permission: PERMISSIONS.REVIEWS_READ,
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    permission: PERMISSIONS.NOTIFICATIONS_READ,
  },
  {
    label: "Marketing",
    href: "/admin/marketing",
    icon: Sparkles,
    permission: PERMISSIONS.CAMPAIGNS_READ,
  },
  {
    label: "Support",
    href: "/admin/support",
    icon: LifeBuoy,
    permission: PERMISSIONS.SUPPORT_READ,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    permission: PERMISSIONS.ANALYTICS_READ,
  },
  {
    label: "Staff & RBAC",
    href: "/admin/staff",
    icon: ShieldAlert,
    permission: PERMISSIONS.STAFF_READ,
  },
  {
    label: "Roles & Permissions",
    href: "/admin/roles",
    icon: ShieldAlert,
    permission: PERMISSIONS.ROLES_READ,
  },
  {
    label: "System Settings",
    href: "/admin/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_READ,
  },
  {
    label: "Audit Logs",
    href: "/admin/audit",
    icon: History,
    permission: PERMISSIONS.AUDIT_READ,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();

  // Filter items based on staff permissions
  const visibleNavItems = ALL_ADMIN_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside className="w-64 bg-neutral-950 text-neutral-100 flex flex-col justify-between border-r border-neutral-800 shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-neutral-800 space-y-1">
          <Link href="/admin" className="font-serif text-2xl tracking-widest text-white block">
            VÉRONA
          </Link>
          <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-sans">
            Operations & Administration
          </p>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1" aria-label="Admin Navigation">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-xs rounded-sm transition-colors ${
                  isActive
                    ? "bg-neutral-800 text-white font-medium shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-neutral-800 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-sm transition-colors"
        >
          <Store className="h-4 w-4 shrink-0" />
          <span>View Storefront</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-neutral-900 rounded-sm transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Exit Admin</span>
        </Link>
      </div>
    </aside>
  );
}
