"use client";

import { ChevronDown, LoaderCircle, Search } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/core/utils/cn";
import { controlClasses } from "./fields";

export type SearchSelectPage<T> = { items: T[]; totalCount: number };

/** The panel's list height; the panel opens above the box when there is no room below. */
const LIST_HEIGHT = 280;

type Placement = { left: number; width: number; top?: number; bottom?: number };

/**
 * A dropdown that looks like a select, with a search box at the top of its list: options come from the
 * server (`load`), a page at a time, with more loaded on scrolling. The list sits in a portal (inside the
 * dialog when in a popup) so cards and popups don't clip it. With `name`, the chosen key is posted in a
 * hidden input.
 */
export function SearchSelect<T>({
  id,
  name,
  value,
  onChange,
  load,
  optionKey,
  optionLabel,
  renderOption,
  placeholder = "Choose…",
  searchPlaceholder = "Search…",
  emptyText = "Nothing matches.",
  disabled,
}: {
  id?: string;
  name?: string;
  value: T | null;
  onChange: (option: T) => void;
  /** A page of options for the search text, starting at `offset`. Throw to show an error. */
  load: (search: string, offset: number) => Promise<SearchSelectPage<T>>;
  optionKey: (option: T) => string;
  /** Shown in the box once chosen. */
  optionLabel: (option: T) => string;
  /** A list row; the label when not given. */
  renderOption?: (option: T) => ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  // Inside a modal <dialog> the panel must render in the dialog: the page outside it is inert and below the top layer.
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const requestRef = useRef(0);
  const listId = useId();

  const fetchPage = useCallback(
    async (search: string, offset: number) => {
      const request = ++requestRef.current;
      setLoading(true);
      setError(null);
      try {
        const page = await load(search, offset);
        if (request !== requestRef.current) return;
        setItems((current) => (offset === 0 ? page.items : [...current, ...page.items]));
        setTotal(page.totalCount);
        if (offset === 0) {
          setActive(0);
          listRef.current?.scrollTo({ top: 0 });
        }
      } catch (caught) {
        if (request === requestRef.current) setError(caught instanceof Error && caught.message ? caught.message : "Couldn't load the list.");
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [load],
  );

  // The first page as soon as the panel opens, then a new search 250 ms after the user stops typing.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchPage(query.trim(), 0), query.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, query, fetchPage]);

  // Keeps the panel under (or over) the box while the page scrolls or resizes, and closes it on a click outside.
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const panelHeight = LIST_HEIGHT + 56;
    setPlacement(
      window.innerHeight - rect.bottom < panelHeight + 8 && rect.top > window.innerHeight - rect.bottom
        ? { left, width, bottom: window.innerHeight - rect.top + 4 }
        : { left, width, top: rect.bottom + 4 },
    );
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    setPortalTarget(triggerRef.current?.closest("dialog") ?? document.body);
    place();
    function outside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      requestRef.current++;
      setLoading(false);
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", outside);
    };
  }, [open, place]);

  // The search box takes the focus once the panel is in place.
  useEffect(() => {
    if (open && placement && portalTarget) searchRef.current?.focus();
  }, [open, placement, portalTarget]);

  function openPanel() {
    if (disabled || open) return;
    setQuery("");
    setOpen(true);
  }

  function close(focusBox = true) {
    setOpen(false);
    requestRef.current++;
    setLoading(false);
    if (focusBox) triggerRef.current?.focus();
  }

  function choose(option: T) {
    onChange(option);
    close();
  }

  const hasMore = items.length < total;
  function onScroll(event: UIEvent<HTMLUListElement>) {
    const list = event.currentTarget;
    if (!loading && hasMore && list.scrollTop + list.clientHeight >= list.scrollHeight - 40) fetchPage(query.trim(), items.length);
  }

  const chosenKey = value ? optionKey(value) : null;

  return (
    <>
      {name && <input type="hidden" name={name} value={chosenKey ?? ""} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPanel();
          }
        }}
        className={cn(controlClasses, "flex h-9 items-center justify-between gap-2 text-left")}
      >
        <span className={cn("truncate", !value && "text-gray-400 dark:text-white/30")} title={value ? optionLabel(value) : undefined}>
          {value ? optionLabel(value) : placeholder}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-gray-500 transition", open && "rotate-180")} aria-hidden />
      </button>

      {open &&
        placement &&
        portalTarget &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom }}
            className="z-[100000] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="relative border-b border-gray-100 p-2 dark:border-gray-800">
              <Search className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-controls={listId}
                aria-expanded
                aria-autocomplete="list"
                aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
                autoComplete="off"
                value={query}
                placeholder={searchPlaceholder}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    if (active >= items.length - 3 && hasMore && !loading) fetchPage(query.trim(), items.length);
                    setActive((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((index) => Math.max(index - 1, 0));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    if (items[active]) choose(items[active]);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    close();
                  } else if (event.key === "Tab") {
                    close(false);
                  }
                }}
                className="h-9 w-full rounded-lg border border-gray-300 bg-transparent pr-8 pl-8 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30"
              />
              {loading && <LoaderCircle className="absolute top-1/2 right-4.5 size-4 -translate-y-1/2 animate-spin text-gray-400" aria-hidden />}
            </div>
            <ul ref={listRef} id={listId} role="listbox" onScroll={onScroll} style={{ maxHeight: LIST_HEIGHT }} className="overflow-auto py-1 text-sm">
              {items.map((option, index) => {
                const key = optionKey(option);
                return (
                  <li
                    key={key}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={key === chosenKey}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-gray-800 dark:text-white/90",
                      index === active ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5",
                      key === chosenKey && "font-medium text-brand-600 dark:text-brand-400",
                    )}
                  >
                    {renderOption ? renderOption(option) : optionLabel(option)}
                  </li>
                );
              })}
              {error && <li className="px-3 py-2 text-red-600 dark:text-red-400">{error}</li>}
              {!error && !loading && items.length === 0 && <li className="px-3 py-2 text-gray-500 dark:text-gray-400">{emptyText}</li>}
              {!error && (hasMore || (loading && items.length > 0)) && (
                <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {loading ? "Loading…" : `Showing ${items.length} of ${total}. Scroll for more.`}
                </li>
              )}
            </ul>
          </div>,
          portalTarget,
        )}
    </>
  );
}
