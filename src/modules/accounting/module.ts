import { Calculator } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { ACCOUNTING_MANAGE_PERMISSION, ACCOUNTING_VIEW_PERMISSION } from "./types";

export const accountingModule = defineModule({
  key: "accounting",
  name: "Accounting",
  description: "Chart of accounts, vouchers, bill payments and collections, ledgers, trial balance and balance sheet.",
  icon: Calculator,
  basePath: "/accounting",
  status: "active",
  // The API's AccountingView / AccountingManage policies check these permission codes.
  accessPermissions: [ACCOUNTING_VIEW_PERMISSION, ACCOUNTING_MANAGE_PERMISSION],
  nav: [
    { label: "Overview", href: "/accounting", exact: true },
    { label: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
    { label: "Vouchers", href: "/accounting/vouchers" },
    { label: "Bill Payment", href: "/accounting/bill-payments" },
    { label: "Bill Collection", href: "/accounting/bill-collections" },
    { label: "Subsidiary Ledger", href: "/accounting/reports/subsidiary-ledger" },
    { label: "Trial Balance", href: "/accounting/reports/trial-balance" },
    { label: "Balance Sheet", href: "/accounting/reports/balance-sheet" },
  ],
  permissions: [
    { key: ACCOUNTING_VIEW_PERMISSION, label: "View the chart of accounts, vouchers and accounting reports" },
    { key: ACCOUNTING_MANAGE_PERMISSION, label: "Change the chart of accounts; enter, post and cancel vouchers, bill payments and collections" },
  ],
});
