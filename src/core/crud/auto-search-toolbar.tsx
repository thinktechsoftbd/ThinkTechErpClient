"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Select } from "@/core/forms/fields";
import { cn } from "@/core/utils/cn";

/** The longest search the API accepts ([StringLength(100)] on its list queries). */
const MAX_SEARCH_LENGTH = 100;
const DEBOUNCE_MS = 350;

export type AutoFilter = {
  name: string;
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  allLabel: string;
  /** The width of the filter, e.g. "w-40". */
  className?: string;
};

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
}: {
  basePath: string;
  search?: string;
  placeholder?: string;
  filters?: AutoFilter[];
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

  const filtered = Boolean(text.trim() || filters.some((filter) => filter.value));

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
          {/* Uncontrolled, keyed by the applied value: the choice shows at once, and Back or Clear resets it. */}
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
        </div>
      ))}
      {filtered && (
        <button
          type="button"
          onClick={() => {
            clearTimeout(timer.current);
            setText("");
            go({ q: "", ...Object.fromEntries(filters.map((filter) => [filter.name, ""])) });
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
