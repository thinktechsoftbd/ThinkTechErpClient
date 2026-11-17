import { ShieldCheck } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { WARRANTY_MANAGE_PERMISSION, WARRANTY_VIEW_PERMISSION } from "./types";

// Warranty & Service in one place: the service desk (jobs, warranty check, cards, supplier claims) under
// Warranty -> Transactions, and the warranty policies under Warranty -> Settings (security.Menu).
export const warrantyModule = defineModule({
  key: "warranty",
  name: "Warranty",
  description: "Warranty cards for what you sell, the counter's warranty check, repair and service jobs, and claims to suppliers.",
  icon: ShieldCheck,
  basePath: "/warranty",
  status: "active",
  // The API's WarrantyView / WarrantyManage policies check these permission codes.
  accessPermissions: [WARRANTY_VIEW_PERMISSION, WARRANTY_MANAGE_PERMISSION],
  nav: [
    { label: "Warranty", href: "/warranty/service" },
    { label: "Warranty Policies", href: "/warranty/policies" },
    { label: "Product Warranty", href: "/warranty/products" },
  ],
  permissions: [
    { key: WARRANTY_VIEW_PERMISSION, label: "View warranty cards, service jobs and supplier claims" },
    { key: WARRANTY_MANAGE_PERMISSION, label: "Set warranty policies; open, bill and deliver service jobs; send supplier claims" },
  ],
});
