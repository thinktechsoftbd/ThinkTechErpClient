"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Input, Select } from "@/core/forms/fields";
import { SearchSelect } from "@/core/forms/search-select";
import { cn } from "@/core/utils/cn";

/** The longest search the API accepts ([StringLength(100)] on its list queries). */
const MAX_SEARCH_LENGTH = 100;
const DEBOUNCE_MS = 350;

export type AutoFilterOption = {
  value: string;
  /** Shown (and searched) in the list, e.g. a category's path "Computer Accessories > Mouse". */
  label: string;
  /** Shown in the box once chosen, e.g. just "Mouse"; the label when not given. */
  shortLabel?: string;
};

export type AutoFilter = {
  name: string;
  label: string;
  value?: string;
  options: readonly AutoFilterOption[];
  allLabel: string;
  /** The width of the filter, e.g. "w-40". */
  className?: string;
  /** A dropdown with a search box (type to narrow a long list, e.g. categories or brands) instead of a plain select. */
  searchable?: boolean;
};

/** How many matches the searchable filter's list shows at a time (more load on scrolling). */
const SEARCH_PAGE = 100;

/** A filter with a search box in its list; it searches the options it was given, every word anywhere in the label. */
function SearchableFilter({ filter, onPick }: { filter: AutoFilter; onPick: (value: string) => void }) {
  const all = useMemo<AutoFilterOption>(() => ({ value: "", label: filter.allLabel }), [filter.allLabel]);
  const [picked, setPicked] = useState<AutoFilterOption>(() => filter.options.find((option) => option.value === filter.value) ?? all);
  const load = useCallback(
    async (search: string, offset: number) => {
      const words = search.toLowerCase().split(/\s+/).filter(Boolean);
      const matches =
        words.length === 0 ? [all, ...filter.options] : filter.options.filter((option) => words.every((word) => option.label.toLowerCase().includes(word)));
      return { items: matches.slice(offset, offset + SEARCH_PAGE), totalCount: matches.length };
    },
    [all, filter.options],
  );
  const what = filter.label.toLowerCase();
  // "All customers" -> "customers", for when the list itself is empty (nothing added yet).
  const plural = filter.allLabel.replace(/^all\s+/i, "").toLowerCase();
  return (
    <SearchSelect
      value={picked}
      onChange={(option) => {
        setPicked(option);
        if (option.value !== (filter.value ?? "")) onPick(option.value);
      }}
      load={load}
      optionKey={(option) => option.value || "(all)"}
      optionLabel={(option) => option.shortLabel ?? option.label}
      renderOption={(option) => option.label}
      searchPlaceholder={`Search ${what}…`}
      emptyText={filter.options.length === 0 ? `No ${plural} yet.` : `No ${what} matches.`}
      panelMinWidth={300}
    />
  );
}

/**
 * Search and filters for a server-paginated list that apply as you go: the list reloads a moment after you
 * stop typing, and at once when a filter changes. Both are kept in the address (?q=…&…, back to the first
 * page), so the list stays shareable and Back works.
 */
export function AutoSearchToolbar({
  basePath,
  search,
  placeholder = "Search",
  filters = [],
  dateRange,
}: {
  basePath: string;
  search?: string;
  placeholder?: string;
  filters?: AutoFilter[];
  /**
   * From and to date boxes (?from=…&to=…, YYYY-MM-DD): a date applies once it is complete (picked or typed);
   * clearing one applies on leaving the box, so a half-typed date doesn't reload the list.
   */
  dateRange?: { from?: string; to?: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(search ?? "");
  const [pending, startTransition] = useTransition();

  // A search from elsewhere (Back, a link) replaces what is typed, unless it is what was typed.
  const [seenSearch, setSeenSearch] = useState(search ?? "");
  if ((search ?? "") !== seenSearch) {
    setSeenSearch(search ?? "");
    if (text.trim() !== (search ?? "")) setText(search ?? "");
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Goes to the list with these query values changed (empty removes one) and from the first page. */
  function go(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("offset");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false }));
  }

  function type(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (value.trim() !== (params.get("q") ?? "")) go({ q: value.trim() });
    }, DEBOUNCE_MS);
  }

  const filtered = Boolean(text.trim() || filters.some((filter) => filter.value) || dateRange?.from || dateRange?.to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Widths live on wrappers: the shared controls are w-full. */}
      <div className="relative w-full sm:w-64">
        {pending ? (
          <LoaderCircle className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-brand-500" aria-hidden />
        ) : (
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        )}
        <Input
          type="search"
          value={text}
          onChange={(event) => type(event.target.value)}
          onKeyDown={(event) => {
            // Enter searches at once instead of waiting.
            if (event.key === "Enter") {
              clearTimeout(timer.current);
              go({ q: text.trim() });
            }
          }}
          maxLength={MAX_SEARCH_LENGTH}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 pl-9"
        />
      </div>
      {filters.map((filter) => (
        <div key={filter.name} className={filter.className ?? "w-40"}>
          {/* Keyed by the applied value: the choice shows at once, and Back or Clear resets it. */}
          {filter.searchable ? (
            <SearchableFilter key={filter.value ?? ""} filter={filter} onPick={(value) => go({ [filter.name]: value })} />
          ) : (
            <Select
              key={filter.value ?? ""}
              defaultValue={filter.value ?? ""}
              onChange={(event) => go({ [filter.name]: event.target.value })}
              aria-label={filter.label}
              className="h-9"
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      ))}
      {dateRange &&
        (["from", "to"] as const).map((name) => {
          const applied = dateRange[name] ?? "";
          const label = name === "from" ? "From date" : "To date";
          return (
            <div key={name} className="w-38">
              {/* Keyed by the applied date: Back or Clear resets the box; a half-typed date stays as typed. */}
              <Input
                key={applied}
                type="date"
                defaultValue={applied}
                onChange={(event) => {
                  if (event.target.value && event.target.value !== applied) go({ [name]: event.target.value });
                }}
                onBlur={(event) => {
                  if (!event.target.value && applied) go({ [name]: "" });
                }}
                aria-label={label}
                title={label}
                className="h-9 px-3"
              />
            </div>
          );
        })}
      {filtered && (
        <button
          type="button"
          onClick={() => {
            clearTimeout(timer.current);
            setText("");
            go({ q: "", ...Object.fromEntries(filters.map((filter) => [filter.name, ""])), ...(dateRange ? { from: "", to: "" } : {}) });
          }}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
          )}
        >
          <X className="size-4" aria-hidden /> Clear
        </button>
      )}
    </div>
  );
}
