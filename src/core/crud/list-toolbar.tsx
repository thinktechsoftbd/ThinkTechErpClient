import Form from "next/form";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input, Select } from "@/core/forms/fields";
import { Button, LinkButton } from "@/core/ui/button";

/**
 * Search box plus optional filters for a server-paginated list. Submitting navigates to
 * `basePath?q=…&…` (dropping `offset`, so results start from the first page).
 */
export function ListToolbar({
  basePath,
  search,
  placeholder = "Search",
  filtered,
  children,
}: {
  basePath: string;
  search?: string;
  placeholder?: string;
  /** Whether any search or filter is applied (shows "Clear"). */
  filtered: boolean;
  /** Extra filter controls (e.g. <FilterSelect>), named like their query parameters. */
  children?: ReactNode;
}) {
  return (
    <Form action={basePath} className="flex flex-wrap items-center gap-2">
      {/* Widths live on wrappers: the shared controls are w-full. */}
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <Input name="q" defaultValue={search} placeholder={placeholder} className="h-9 pl-9" aria-label={placeholder} />
      </div>
      {children}
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
      {filtered && (
        <LinkButton href={basePath} variant="ghost" size="sm">
          Clear
        </LinkButton>
      )}
    </Form>
  );
}

export function FilterSelect({
  name,
  label,
  value,
  options,
  allLabel,
  className = "w-40",
}: {
  name: string;
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  allLabel: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Select name={name} defaultValue={value ?? ""} aria-label={label} className="h-9">
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export const ACTIVE_FILTER_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
] as const;

/** Reads the `active` query value as the API's optional isActive filter. */
export function parseActiveFilter(value: string | undefined) {
  return value === "true" ? true : value === "false" ? false : undefined;
}

/** Page size for the server-paginated CRUD lists. */
export const CRUD_PAGE_SIZE = 20;
