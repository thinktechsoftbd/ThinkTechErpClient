"use client";

import { useCallback, useMemo, useState } from "react";
import { SearchSelect, searchOptions } from "./search-select";

export type SearchableOption = {
  value: string;
  /** Shown (and searched) in the list, e.g. a category's path. */
  label: string;
  /** Shown in the box once chosen; the label when not given. */
  shortLabel?: string;
};

/**
 * A select with a search box in its list, for a plain form (e.g. a report's filter bar): the choice is posted as
 * `name` like a <select>, and the form is sent by its own button. `allLabel` adds the "no filter" choice (value "").
 */
export function SearchableSelectField({
  name,
  label,
  value,
  options,
  allLabel,
}: {
  name: string;
  /** What is chosen, e.g. "Warehouse": names the search box and the empty message. */
  label: string;
  value?: string;
  options: readonly SearchableOption[];
  allLabel?: string;
}) {
  const all = useMemo<SearchableOption | null>(() => (allLabel === undefined ? null : { value: "", label: allLabel }), [allLabel]);
  const [picked, setPicked] = useState<SearchableOption | null>(() => options.find((option) => option.value === value) ?? all);
  const choices = useMemo(() => (all ? [all, ...options] : [...options]), [all, options]);
  const load = useCallback(
    async (search: string, offset: number) => searchOptions(choices, (option) => option.label, search, offset),
    [choices],
  );
  const what = label.toLowerCase();
  // "All warehouses" -> "warehouses", for an empty list (nothing added yet).
  const plural = allLabel ? allLabel.replace(/^(all|any)\s+/i, "").toLowerCase() : `${what}s`;

  return (
    <>
      <input type="hidden" name={name} value={picked?.value ?? ""} />
      <SearchSelect
        value={picked}
        onChange={setPicked}
        load={load}
        optionKey={(option) => option.value || "(all)"}
        optionLabel={(option) => option.shortLabel ?? option.label}
        renderOption={(option) => option.label}
        placeholder={allLabel ?? `Choose a ${what}`}
        searchPlaceholder={`Search ${what}…`}
        emptyText={options.length === 0 ? `No ${plural} yet.` : `No ${what} matches.`}
        panelMinWidth={300}
      />
    </>
  );
}
