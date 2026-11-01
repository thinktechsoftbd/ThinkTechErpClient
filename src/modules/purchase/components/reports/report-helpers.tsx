import type { ApiResult } from "@/core/api/client";
import { formatAmount } from "@/core/utils/number";
import type { SupplierOption } from "@/modules/purchase/types";

/** Suppliers for a report's supplier filter ("Name (CODE)"). */
export function supplierOptions(result: ApiResult<SupplierOption[]>) {
  return (result.ok ? result.data : []).map((supplier) => ({
    value: String(supplier.id),
    label: `${supplier.name} (${supplier.code})${supplier.isActive ? "" : " · inactive"}`,
  }));
}

/** What a supplier balance means: + is owed to the supplier, − is an advance with them. */
export function balanceMeaning(balance: number) {
  if (balance > 0) return "Owed to the supplier";
  if (balance < 0) return "Advance with the supplier";
  return "Settled";
}

/** A supplier balance; an advance (negative) shows in green. */
export function BalanceAmount({ value }: { value: number }) {
  return <span className={value < 0 ? "text-green-700 dark:text-green-400" : undefined}>{formatAmount(value)}</span>;
}
