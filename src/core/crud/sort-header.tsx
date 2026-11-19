import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TH } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";

export type SortDirection = "asc" | "desc";

/**
 * A column header of a server-sorted list: a link to the list sorted by this column (?sort=…&dir=…, back to the
 * first page), ascending first and flipping on a second click. `query` holds the list's other parameters (the
 * search, filters) so sorting keeps them.
 */
export function SortHeader({
  label,
  column,
  sort,
  direction,
  basePath,
  query = {},
  className,
}: {
  label: string;
  column: string;
  sort: string;
  direction: SortDirection;
  basePath: string;
  query?: Record<string, string | undefined>;
  className?: string;
}) {
  const active = sort === column;
  const next: SortDirection = active && direction === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  params.set("sort", column);
  params.set("dir", next);
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TH className={className} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}>
      <Link
        href={`${basePath}?${params.toString()}`}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 hover:text-brand-500",
          active ? "text-gray-700 dark:text-gray-200" : undefined,
        )}
        title={`Sort by ${label.toLowerCase()} (${next === "asc" ? "A to Z" : "Z to A"})`}
      >
        {label}
        <Icon className={cn("size-3.5", active ? "text-brand-500" : "opacity-40")} aria-hidden />
      </Link>
    </TH>
  );
}
