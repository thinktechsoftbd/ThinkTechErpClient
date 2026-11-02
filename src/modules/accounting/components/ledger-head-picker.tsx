"use client";

import { ChevronDown, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type UIEvent } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/core/forms/fields";
import { cn } from "@/core/utils/cn";
import type { LedgerHeadOption } from "../types";
import { ledgerHeadLabel } from "./pickers";

// /api/lookup/ledger-heads returns 20 heads a page.

/** The list's height; it opens above the input when there is no room below. */
const LIST_HEIGHT = 320;

type Placement = { left: number; width: number; top?: number; bottom?: number };

/**
 * Picks a ledger head (a sub class of the chart) by searching the server as the user types, by sub code or
 * sub name, 20 at a time, with more loaded on scrolling. Each head shows as
 * {sub code}-{sub name}/{map class}/{main class}/{account class}/{parent class}. The list sits in a portal
 * so tables that scroll sideways don't clip it. With `name`, the chosen id is also posted in a hidden input.
 */
export function LedgerHeadPicker({
  value,
  onChange,
  id,
  name,
  required,
  placeholder = "Search code or name…",
  className,
  "aria-label": ariaLabel,
}: {
  value: LedgerHeadOption | null;
  onChange: (head: LedgerHeadOption | null) => void;
  id?: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
  /** For the input, e.g. its height. */
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<LedgerHeadOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const requestRef = useRef(0);
  const listId = useId();

  const load = useCallback(async (search: string, offset: number) => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (search) params.set("search", search);
      const response = await fetch(`/api/lookup/ledger-heads?${params}`, { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => null);
      if (request !== requestRef.current) return;
      if (!response.ok || !Array.isArray(data?.items)) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't load the ledger heads.");
        return;
      }
      setItems((current) => (offset === 0 ? data.items : [...current, ...data.items]));
      setTotal(typeof data.totalCount === "number" ? data.totalCount : data.items.length);
      if (offset === 0) {
        setActive(0);
        listRef.current?.scrollTo({ top: 0 });
      }
    } catch {
      if (request === requestRef.current) setError("Couldn't load the ledger heads.");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  // The first page as soon as the list opens, then a new search 250 ms after the user stops typing.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => load(query.trim(), 0), query.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, query, load]);

  // Keeps the list under (or over) the input while the page scrolls or resizes.
  const place = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(Math.max(rect.width, 480), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPlacement(
      window.innerHeight - rect.bottom < LIST_HEIGHT + 8 && rect.top > window.innerHeight - rect.bottom
        ? { left, width, bottom: window.innerHeight - rect.top + 4 }
        : { left, width, top: rect.bottom + 4 },
    );
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  const hasMore = items.length < total;
  const loadMore = () => {
    if (!loading && hasMore) load(query.trim(), items.length);
  };

  function onScroll(event: UIEvent<HTMLUListElement>) {
    const list = event.currentTarget;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 40) loadMore();
  }

  function openList() {
    if (open) return;
    setQuery("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery("");
    requestRef.current++;
    setLoading(false);
  }

  function pick(head: LedgerHeadOption) {
    onChange(head);
    close();
  }

  const activeId = open && items[active] ? `${listId}-${items[active].id}` : undefined;

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value?.id ?? ""} />}
      <Input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        required={required}
        value={open ? query : value ? ledgerHeadLabel(value) : ""}
        placeholder={open && value ? ledgerHeadLabel(value) : placeholder}
        title={value ? ledgerHeadLabel(value) : undefined}
        onFocus={openList}
        onClick={openList}
        onBlur={close}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) openList();
            else if (active >= items.length - 3) loadMore();
            setActive((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            if (!open) return;
            event.preventDefault();
            if (items[active]) pick(items[active]);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            close();
          }
        }}
        className={cn("truncate pr-14", className)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1 text-gray-400">
        {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
      </span>
      {value && !required && !open && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-red-500"
          aria-label="Clear the ledger head"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}

      {open &&
        placement &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            onScroll={onScroll}
            // Keeps the focus in the input, so clicking an option or the scroll bar doesn't close the list.
            onMouseDown={(event) => event.preventDefault()}
            style={{ position: "fixed", left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom, maxHeight: LIST_HEIGHT }}
            className="z-[100000] overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-900"
          >
            {items.map((head, index) => (
              <li
                key={head.id}
                id={`${listId}-${head.id}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(head)}
                className={cn(
                  "cursor-pointer px-3 py-2",
                  index === active ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5",
                  head.id === value?.id && "font-medium",
                )}
              >
                {/* {sub code}-{sub name}/{map class}/{main class}/{account class}/{parent class} */}
                <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{head.code}</span>
                <span className="text-gray-800 dark:text-white/90">-{head.name}</span>
                {head.path && <span className="text-gray-500 dark:text-gray-400">/{head.path}</span>}
              </li>
            ))}
            {error && <li className="px-3 py-2 text-red-600 dark:text-red-400">{error}</li>}
            {!error && !loading && items.length === 0 && (
              <li className="px-3 py-2 text-gray-500 dark:text-gray-400">
                {query.trim() ? `No ledger head matches “${query.trim()}”.` : "No ledger heads yet."} Vouchers post to sub classes: add
                one under its map class in the Chart of Accounts.
              </li>
            )}
            {(hasMore || (loading && items.length > 0)) && (
              <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                {loading ? "Loading…" : `Showing ${items.length} of ${total}. Scroll for more.`}
              </li>
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}

/** A ledger head picker that keeps its own value, for filter forms: the chosen id is posted as `name`. */
export function LedgerHeadField({
  defaultValue,
  ...props
}: Omit<Parameters<typeof LedgerHeadPicker>[0], "value" | "onChange"> & { name: string; defaultValue: LedgerHeadOption | null }) {
  const [value, setValue] = useState(defaultValue);
  return <LedgerHeadPicker {...props} value={value} onChange={setValue} />;
}
