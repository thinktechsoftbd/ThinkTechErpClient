import { ShoppingBag } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { SALES_MANAGE_PERMISSION, SALES_VIEW_PERMISSION } from "./types";

// The screens sit in the Inventory menu (security.Menu); the routes and permission are their own so a
// counter user can sell without inventory rights.
export const salesModule = defineModule({
  key: "sales",
  name: "Sales",
  description: "Customers, cash and credit sales at the counter, money received, customer dues and sales reports.",
  icon: ShoppingBag,
  basePath: "/sales",
  status: "active",
  // The API's SalesView / SalesManage policies check these permission codes.
  accessPermissions: [SALES_VIEW_PERMISSION, SALES_MANAGE_PERMISSION],
  nav: [
    { label: "Sales", href: "/sales/invoices" },
    { label: "Customer Receipts", href: "/sales/receipts" },
    { label: "Sales Returns", href: "/sales/returns" },
    { label: "Customers", href: "/sales/customers" },
    { label: "Sales Register", href: "/sales/reports/register" },
    { label: "Sales by Product", href: "/sales/reports/by-product" },
    { label: "Customer Dues", href: "/sales/reports/customer-dues" },
    { label: "Customer Ledger", href: "/sales/reports/customer-ledger" },
  ],
  permissions: [
    { key: SALES_VIEW_PERMISSION, label: "View customers, sales, receipts and sales reports" },
    { key: SALES_MANAGE_PERMISSION, label: "Manage customers; enter and post sales and customer receipts" },
  ],
});
