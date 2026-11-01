import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ApiResult } from "@/core/api/client";
import { Card } from "@/core/ui/card";
import { Skeleton, StatCard, StatGridSkeleton, TableSkeleton } from "@/core/ui/feedback";
import { Pagination, firstParam, type QueryValues } from "@/core/ui/pagination";
import { Table } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatDate } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import type { InventoryOptions } from "@/modules/inventory/types";

// Building blocks shared by the Inventory and Purchase report pages (server components).

/** Rows per page of the paged reports. */
export const REPORT_PAGE_SIZE = 50;

/** Classes of a numeric table cell. */
export const NUM = "text-right whitespace-nowrap tabular-nums";

type Param = string | string[] | undefined;

/** A positive id from the query (`?warehouse=3`); anything else is no filter. */
export function idParam(value: Param) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

/** A yes/no query flag (`?low=true`). */
export function flagParam(value: Param) {
  const raw = firstParam(value)?.toLowerCase();
  return raw === "true" || raw === "1" || raw === "on" || raw === "yes";
}

/** A calendar date from the query (YYYY-MM-DD); anything else is no filter. */
export function dateParam(value: Param) {
  const raw = firstParam(value);
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : undefined;
}

/** A flag as it goes back into a URL (left out when false). */
export function flagQuery(value: boolean) {
  return value ? "true" : undefined;
}

/** "1 Oct 2026 – 31 Oct 2026", "From 1 Oct 2026", "Up to 31 Oct 2026" or undefined. */
export function periodText(from: string | undefined, to: string | undefined) {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `From ${formatDate(from)}`;
  if (to) return `Up to ${formatDate(to)}`;
  return undefined;
}

/** Joins the applied filters for a report's subtitle (also printed): "Main store · 1 Oct – 31 Oct". */
export function criteriaText(...parts: (string | null | undefined | false)[]) {
  const text = parts.filter(Boolean).join(" · ");
  return text || undefined;
}

export function warehouseOptions(options: ApiResult<InventoryOptions>) {
  return (options.ok ? options.data.warehouses : []).map((warehouse) => ({
    value: String(warehouse.id),
    label: warehouse.isActive ? warehouse.name : `${warehouse.name} (inactive)`,
  }));
}

/** Categories by path ("Fertilizer > Urea"); a category includes its sub-categories. */
export function categoryOptions(options: ApiResult<InventoryOptions>) {
  return [...(options.ok ? options.data.categories : [])]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((category) => ({ value: String(category.id), label: category.isActive ? category.path : `${category.path} (inactive)` }));
}

/** The label of the option with this value (for the subtitle). */
export function optionLabel(options: readonly { value: string; label: string }[], value: number | string | undefined) {
  if (value === undefined) return undefined;
  return options.find((option) => option.value === String(value))?.label;
}

/** Key figures above a report (totals over every row, not just this page). */
export function ReportSummary({
  items,
}: {
  items: { label: string; value: ReactNode; icon: LucideIcon; hint?: ReactNode }[];
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-4 print:gap-2",
        items.length >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} hint={item.hint} />
      ))}
    </div>
  );
}

/** A product's name over its code (and anything else, e.g. the batch), linked when `href` is set. */
export function ProductCell({ name, code, href, detail }: { name: string; code: string; href?: string; detail?: ReactNode }) {
  return (
    <>
      {href ? (
        <Link href={href} className="font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90">
          {name}
        </Link>
      ) : (
        <span className="font-medium text-gray-800 dark:text-white/90">{name}</span>
      )}
      <span className="block text-xs text-gray-500 dark:text-gray-400">
        {code}
        {detail}
      </span>
    </>
  );
}

/** A row's share of the total (0–1) as a bar and a percentage; also printed. */
export function ShareBar({ share }: { share: number }) {
  const percent = Number.isFinite(share) ? share * 100 : 0;
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center justify-end gap-3">
      <div
        className="h-2 w-24 overflow-hidden rounded-full bg-gray-100 [print-color-adjust:exact] sm:w-40 dark:bg-white/5"
        role="presentation"
      >
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
      </div>
      <span className="w-14 text-right text-sm tabular-nums">{percent.toFixed(1)}%</span>
    </div>
  );
}

/** A report table that isn't clipped when printed. */
export function ReportTable({ children }: { children: ReactNode }) {
  return <Table className="print:overflow-visible">{children}</Table>;
}

/** A totals row under a report table. */
export function TotalsFoot({ children }: { children: ReactNode }) {
  return (
    <tfoot className="border-t-2 border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-white/[0.02]">
      <tr className="[&>td]:font-semibold [&>td]:text-gray-800 dark:[&>td]:text-white/90">{children}</tr>
    </tfoot>
  );
}

/** Offset pagination for a report, hidden on print (a printout is the page on screen). */
export function ReportPagination({
  basePath,
  query,
  offset,
  count,
  total,
}: {
  basePath: string;
  query: QueryValues;
  offset: number;
  count: number;
  total: number;
}) {
  return (
    <div className="print:hidden">
      <Pagination basePath={basePath} query={query} offset={offset} limit={REPORT_PAGE_SIZE} count={count} total={total} />
    </div>
  );
}

export function ReportSkeleton({ stats = 3, columns = 6 }: { stats?: number; columns?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-[76px] rounded-2xl" />
      {stats > 0 && <StatGridSkeleton count={stats} />}
      <Card>
        <TableSkeleton columns={columns} />
      </Card>
    </div>
  );
}
