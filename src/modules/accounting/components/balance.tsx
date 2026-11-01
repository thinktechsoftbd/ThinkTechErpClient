import { cn } from "@/core/utils/cn";
import { formatAmount } from "@/core/utils/number";

/** A debit-minus-credit balance as "1,250.00 Dr" or "300.00 Cr" (works on the server and in the browser). */
export function drCrText(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return formatAmount(0);
  return `${formatAmount(Math.abs(rounded))} ${rounded > 0 ? "Dr" : "Cr"}`;
}

export function DrCr({ value, className }: { value: number; className?: string }) {
  return <span className={cn("whitespace-nowrap tabular-nums", className)}>{drCrText(value)}</span>;
}

/** An amount on one side of a debit/credit pair: empty when zero. */
export function sideAmount(value: number) {
  return Math.round(value * 100) / 100 === 0 ? "" : formatAmount(value);
}
