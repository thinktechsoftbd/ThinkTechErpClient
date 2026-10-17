import { Package } from "lucide-react";
import { defineModule } from "@/core/modules/types";

export const inventoryModule = defineModule({
  key: "inventory",
  name: "Inventory",
  description: "Items, warehouses, stock levels and movements.",
  icon: Package,
  basePath: "/inventory",
  status: "planned",
  roles: ["inventory_admin"],
  nav: [{ label: "Overview", href: "/inventory", exact: true }],
  permissions: [
    { key: "inventory.items.view", label: "View items and stock" },
    { key: "inventory.items.manage", label: "Manage items and stock" },
  ],
});
