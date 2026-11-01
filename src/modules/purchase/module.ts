import { ShoppingCart } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { PURCHASE_MANAGE_PERMISSION, PURCHASE_VIEW_PERMISSION } from "./types";

export const purchaseModule = defineModule({
  key: "purchase",
  name: "Purchase",
  description: "Suppliers, taxes, cash and credit purchases, orders, goods receipts, returns, payments and dues.",
  icon: ShoppingCart,
  basePath: "/purchase",
  status: "active",
  // The API's PurchaseView / PurchaseManage policies check these permission codes.
  accessPermissions: [PURCHASE_VIEW_PERMISSION, PURCHASE_MANAGE_PERMISSION],
  nav: [
    { label: "Overview", href: "/purchase", exact: true },
    { label: "Suppliers", href: "/purchase/suppliers" },
    { label: "Tax Rates", href: "/purchase/tax-rates" },
    { label: "Tax Groups", href: "/purchase/tax-groups" },
    { label: "Purchase Invoices", href: "/purchase/invoices" },
    { label: "Purchase Orders", href: "/purchase/orders" },
    { label: "Goods Receipts", href: "/purchase/goods-receipts" },
    { label: "Purchase Returns", href: "/purchase/returns" },
    { label: "Supplier Payments", href: "/purchase/payments" },
    { label: "Supplier Ledger", href: "/purchase/reports/supplier-ledger" },
    { label: "Supplier Dues", href: "/purchase/reports/supplier-dues" },
    { label: "Purchase Register", href: "/purchase/reports/register" },
    { label: "Purchase by Product", href: "/purchase/reports/by-product" },
  ],
  permissions: [
    { key: PURCHASE_VIEW_PERMISSION, label: "View suppliers, purchase documents and purchase reports" },
    { key: PURCHASE_MANAGE_PERMISSION, label: "Manage suppliers and taxes; enter and post purchases and payments" },
  ],
});
