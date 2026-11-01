import { Package } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { INVENTORY_MANAGE_PERMISSION, INVENTORY_VIEW_PERMISSION } from "./types";

export const inventoryModule = defineModule({
  key: "inventory",
  name: "Inventory",
  description: "Products, units, warehouses, opening stock, adjustments, transfers, counts and stock reports.",
  icon: Package,
  basePath: "/inventory",
  status: "active",
  // The API's InventoryView / InventoryManage policies check these permission codes.
  accessPermissions: [INVENTORY_VIEW_PERMISSION, INVENTORY_MANAGE_PERMISSION],
  nav: [
    { label: "Overview", href: "/inventory", exact: true },
    { label: "Products", href: "/inventory/products" },
    { label: "Categories", href: "/inventory/categories" },
    { label: "Brands", href: "/inventory/brands" },
    { label: "Units", href: "/inventory/units" },
    { label: "Warehouses", href: "/inventory/warehouses" },
    { label: "Inventory Settings", href: "/inventory/settings" },
    { label: "Opening Stock", href: "/inventory/opening-stock" },
    { label: "Stock Adjustments", href: "/inventory/adjustments" },
    { label: "Stock Transfers", href: "/inventory/transfers" },
    { label: "Stock Counts", href: "/inventory/counts" },
    { label: "Stock on Hand", href: "/inventory/reports/stock-on-hand" },
    { label: "Stock Card", href: "/inventory/reports/stock-card" },
    { label: "Stock Valuation", href: "/inventory/reports/valuation" },
    { label: "Stock Movements", href: "/inventory/reports/movements" },
    { label: "Reorder Alert", href: "/inventory/reports/reorder" },
    { label: "Expiry Alert", href: "/inventory/reports/expiry" },
  ],
  permissions: [
    { key: INVENTORY_VIEW_PERMISSION, label: "View products, stock documents and stock reports" },
    { key: INVENTORY_MANAGE_PERMISSION, label: "Manage inventory settings; enter and post stock documents" },
  ],
});
