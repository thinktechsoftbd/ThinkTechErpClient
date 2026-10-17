import { ShoppingCart } from "lucide-react";
import { defineModule } from "@/core/modules/types";

export const purchaseModule = defineModule({
  key: "purchase",
  name: "Purchase",
  description: "Suppliers, purchase orders and goods receipts.",
  icon: ShoppingCart,
  basePath: "/purchase",
  status: "planned",
  roles: ["purchase_admin"],
  nav: [{ label: "Overview", href: "/purchase", exact: true }],
  permissions: [
    { key: "purchase.orders.view", label: "View purchase orders" },
    { key: "purchase.orders.manage", label: "Create and approve purchase orders" },
  ],
});
