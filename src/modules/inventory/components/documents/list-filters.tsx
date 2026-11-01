import { Input } from "@/core/forms/fields";
import { firstParam, parseOffset } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";

export type ListSearchParams = Record<string, string | string[] | undefined>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateParam(value: string | string[] | undefined) {
  const text = firstParam(value);
  return text && DATE_PATTERN.test(text) ? text : undefined;
}

/** The filters every stock document list shares: ?q=&status=&warehouse=&from=&to=&offset=. */
export function readDocumentFilters(query: ListSearchParams) {
  const warehouseParam = firstParam(query.warehouse);
  return {
    search: firstParam(query.q),
    status: firstParam(query.status),
    warehouseId: warehouseParam ? (parseIdParam(warehouseParam) ?? undefined) : undefined,
    from: dateParam(query.from),
    to: dateParam(query.to),
    offset: parseOffset(query.offset),
  };
}

/** From / to date inputs for a ListToolbar (named like their query parameters). */
export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  return (
    <>
      <div className="w-38">
        <Input type="date" name="from" defaultValue={from} aria-label="From date" title="From date" className="h-9 px-3" />
      </div>
      <div className="w-38">
        <Input type="date" name="to" defaultValue={to} aria-label="To date" title="To date" className="h-9 px-3" />
      </div>
    </>
  );
}

export function warehouseFilterOptions(warehouses: { id: number; name: string }[]) {
  return warehouses.map((w) => ({ value: String(w.id), label: w.name }));
}
