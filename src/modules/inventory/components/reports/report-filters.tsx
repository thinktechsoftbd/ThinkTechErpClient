import Form from "next/form";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Checkbox, Input, Select } from "@/core/forms/fields";
import { Button, LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { buildHref, type QueryValues } from "@/core/ui/pagination";
import { cn } from "@/core/utils/cn";

/**
 * The filter bar of a report: a GET form, so every report is a shareable URL. Submitting
 * navigates to `basePath?…` without `offset` (results start from the first page). Hidden on print.
 */
export function ReportFilters({
  basePath,
  query,
  filtered,
  clearHref,
  hidden,
  children,
}: {
  basePath: string;
  /** The filters as applied now: remounts the form when they change, so the controls show them. */
  query: QueryValues;
  /** Whether "Clear" is offered (default: any value in `query` is set). */
  filtered?: boolean;
  /** Where "Clear" goes (default `basePath`). */
  clearHref?: string;
  /** Values carried through the form unchanged (e.g. the picked product). */
  hidden?: QueryValues;
  children: ReactNode;
}) {
  const isFiltered = filtered ?? Object.values(query).some((value) => value !== undefined && value !== "");
  return (
    <Card key={buildHref(basePath, query)} className="print:hidden">
      <Form action={basePath} className="flex flex-wrap items-end gap-3 px-5 py-4 sm:px-6">
        {Object.entries(hidden ?? {}).map(([name, value]) =>
          value === undefined || value === "" ? null : <input key={name} type="hidden" name={name} value={String(value)} />,
        )}
        {children}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm">
            Apply
          </Button>
          {isFiltered && (
            <LinkButton href={clearHref ?? basePath} variant="ghost" size="sm">
              Clear
            </LinkButton>
          )}
        </div>
      </Form>
    </Card>
  );
}

/**
 * A labelled control in the filter bar. `group` renders a labelled group instead of a <label>,
 * for a composite control (e.g. a search box with a result list) that names its own input.
 */
export function ReportField({
  label,
  className = "w-44",
  group = false,
  children,
}: {
  label: string;
  className?: string;
  group?: boolean;
  children: ReactNode;
}) {
  const caption = <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>;
  return group ? (
    <div role="group" aria-label={label} className={cn("flex flex-col gap-1", className)}>
      {caption}
      {children}
    </div>
  ) : (
    <label className={cn("flex flex-col gap-1", className)}>
      {caption}
      {children}
    </label>
  );
}

export function ReportSearch({ value, placeholder = "Search", label = "Search" }: { value?: string; placeholder?: string; label?: string }) {
  return (
    <ReportField label={label} className="w-full sm:w-56">
      <span className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <Input name="q" defaultValue={value} placeholder={placeholder} className="h-9 pl-9" />
      </span>
    </ReportField>
  );
}

export function ReportSelect({
  name,
  label,
  value,
  options,
  allLabel,
  className,
}: {
  name: string;
  label: string;
  value?: string | number;
  options: readonly { value: string; label: string }[];
  /** The "no filter" choice; leave out when a value is always chosen. */
  allLabel?: string;
  className?: string;
}) {
  return (
    <ReportField label={label} className={className}>
      <Select name={name} defaultValue={value === undefined ? "" : String(value)} className="h-9">
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </ReportField>
  );
}

export function ReportDate({ name, label, value }: { name: string; label: string; value?: string }) {
  return (
    <ReportField label={label} className="w-40">
      <Input type="date" name={name} defaultValue={value ?? ""} className="h-9" />
    </ReportField>
  );
}

/** A yes/no filter: checked sends `name=true`, unchecked leaves it out of the URL. */
export function ReportToggle({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <div className="flex h-9 items-center">
      <Checkbox name={name} value="true" defaultChecked={checked} label={label} />
    </div>
  );
}
