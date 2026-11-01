import type { ReactNode } from "react";

/** A grid of label/value pairs for a document's header; empty values are left out. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
      {items
        .filter((item) => item.value !== null && item.value !== undefined && item.value !== "" && item.value !== false)
        .map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">{item.label}</dt>
            <dd className="mt-1 text-sm break-words text-gray-800 dark:text-white/90">{item.value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Right-aligned totals (subtotal, tax, total, ...) under a lines table. */
export function TotalsList({ rows }: { rows: { label: string; value: string; strong?: boolean; hidden?: boolean }[] }) {
  return (
    <dl className="ml-auto w-full max-w-sm space-y-2 text-sm">
      {rows
        .filter((row) => !row.hidden)
        .map((row) => (
          <div
            key={row.label}
            className={
              row.strong
                ? "flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90"
                : "flex justify-between text-gray-600 dark:text-gray-400"
            }
          >
            <dt>{row.label}</dt>
            <dd className="tabular-nums">{row.value}</dd>
          </div>
        ))}
    </dl>
  );
}
