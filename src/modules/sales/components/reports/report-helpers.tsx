import { cn } from "@/core/utils/cn";
import { formatAmount } from "@/core/utils/number";
import { periodText } from "@/modules/inventory/components/reports/report-parts";
import type { CustomerOption } from "@/modules/sales/types";

// Building blocks of the Sales report pages (server components).

/** Customers for a report's customer filter ("Name (CODE) · mobile"). */
export function customerOptions(customers: readonly CustomerOption[]) {
  return customers.map((customer) => ({
    value: String(customer.id),
    label: `${customer.name} (${customer.code})${customer.mobile ? ` · ${customer.mobile}` : ""}${customer.isActive ? "" : " · inactive"}`,
  }));
}

/**
 * The period a sales report covers. The API defaults an open end to today and an open start to the
 * first of the end date's month, so no dates at all means this month.
 */
export function salesPeriodText(from: string | undefined, to: string | undefined) {
  if (!from && !to) return "This month";
  if (!from && to) return periodText(`${to.slice(0, 7)}-01`, to);
  return periodText(from, to);
}

/** What a customer balance means: + is owed by the customer, − is an advance from them. */
export function balanceMeaning(balance: number) {
  if (balance > 0) return "Owed by the customer";
  if (balance < 0) return "Advance from the customer";
  return "Settled";
}

/** A customer balance; an advance (negative) shows in green. `showMeaning` adds "Owes" / "Advance" under it. */
export function BalanceAmount({ value, showMeaning = false }: { value: number; showMeaning?: boolean }) {
  return (
    <span className={value < 0 ? "text-green-700 dark:text-green-400" : undefined}>
      {formatAmount(value)}
      {showMeaning && value !== 0 && (
        <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{value > 0 ? "Owes" : "Advance"}</span>
      )}
    </span>
  );
}

/** A profit; a loss (negative) shows in red. */
export function ProfitAmount({ value, className }: { value: number | undefined; className?: string }) {
  return (
    <span className={cn(value !== undefined && value < 0 && "text-red-600 dark:text-red-400", className)}>{formatAmount(value)}</span>
  );
}

/** Profit as a share of net sales ("12.5%"); "—" when there were no net sales. */
export function marginText(profit: number | undefined, netSales: number | undefined) {
  return profit !== undefined && netSales !== undefined && netSales > 0 ? percentText((profit / netSales) * 100) : "—";
}

/** A percentage the API computed (12.345 -> "12.3%"). */
export function percentText(value: number) {
  return `${value.toFixed(1)}%`;
}

/** A customer's credit limit: none, cash only (0) or the amount. */
export function creditLimitText(limit: number | null) {
  if (limit === null) return "No limit";
  if (limit === 0) return "Cash only";
  return formatAmount(limit);
}
