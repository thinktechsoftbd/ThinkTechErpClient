import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/core/utils/cn";

export type QueryValues = Record<string, string | number | undefined>;

export function buildHref(basePath: string, query: QueryValues) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

const linkClasses =
  "inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5";

/**
 * Offset pagination. Without `total` (API lists that don't return a count),
 * "Next" is offered while a full page came back.
 */
export function Pagination({
  basePath,
  query = {},
  offset,
  limit,
  count,
  total,
}: {
  basePath: string;
  query?: QueryValues;
  offset: number;
  limit: number;
  count: number;
  total?: number;
}) {
  const hasPrevious = offset > 0;
  const hasNext = total === undefined ? count >= limit : offset + count < total;
  if (!hasPrevious && !hasNext) return null;

  const from = count === 0 ? offset : offset + 1;
  const to = offset + count;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {from}–{to}
        {total !== undefined && ` of ${total}`}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link className={linkClasses} href={buildHref(basePath, { ...query, offset: Math.max(0, offset - limit) || undefined })}>
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </Link>
        ) : (
          <span className={cn(linkClasses, "pointer-events-none opacity-50")}>
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </span>
        )}
        {hasNext ? (
          <Link className={linkClasses} href={buildHref(basePath, { ...query, offset: offset + limit })}>
            Next <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cn(linkClasses, "pointer-events-none opacity-50")}>
            Next <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}

/** Parses `offset` from search params, clamped to a non-negative integer. */
export function parseOffset(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function firstParam(value: string | string[] | undefined) {
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() || undefined;
}
