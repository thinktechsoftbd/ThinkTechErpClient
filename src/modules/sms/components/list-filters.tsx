import { Input } from "@/core/forms/fields";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";

type Param = string | string[] | undefined;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A YYYY-MM-DD query value; anything else is ignored. */
export function dateParam(value: Param) {
  const text = firstParam(value);
  return text && DATE_PATTERN.test(text) ? text : undefined;
}

/** A positive id query value (e.g. ?provider=3). */
export function idParam(value: Param) {
  const text = firstParam(value);
  return text ? (parseIdParam(text) ?? undefined) : undefined;
}

/** An Object Id query value (e.g. ?organizationId=…), lower-cased. */
export function guidParam(value: Param) {
  const text = firstParam(value);
  return text && GUID_PATTERN.test(text) ? text.toLowerCase() : undefined;
}

/** From / to date inputs for a ListToolbar (named like their query parameters). */
export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  return (
    <>
      <div className="w-38">
        <Input key={from ?? ""} type="date" name="from" defaultValue={from} aria-label="From date" title="From date" className="h-9 px-3" />
      </div>
      <div className="w-38">
        <Input key={to ?? ""} type="date" name="to" defaultValue={to} aria-label="To date" title="To date" className="h-9 px-3" />
      </div>
    </>
  );
}
