"use client";

import { ChevronDown, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/core/forms/fields";
import { cn } from "@/core/utils/cn";
import { formatAmount } from "@/core/utils/number";
import type { SupplierOption } from "../types";

// /api/lookup/suppliers returns the first 20 matches.

/** The list's height; it opens above the input when there is no room below. */
const LIST_HEIGHT = 320;

type Placement = { left: number; width: number; top?: number; bottom?: number };

/** Name - Address, e.g. "Korim - Milonpur"; the code when there's no address. */
const supplierLabel = (supplier: SupplierOption) =>
  supplier.address ? `${supplier.name} - ${supplier.address}` : `${supplier.name} (${supplier.code})`;

/** One supplier by id with its balance and terms (e.g. a draft's), or null when it can't be loaded. */
export async function fetchSupplierOption(id: number): Promise<SupplierOption | null> {
  try {
    const response = await fetch(`/api/lookup/suppliers?id=${id}`, { headers: { Accept: "application/json" } });
    const data: unknown = await response.json().catch(() => null);
    return response.ok && Array.isArray(data) && data[0] ? (data[0] as SupplierOption) : null;
  } catch {
    return null;
  }
}

/** The first 20 suppliers matching the text, or none when they can't be loaded. */
async function searchSuppliers(search: string): Promise<SupplierOption[]> {
  try {
    const response = await fetch(`/api/lookup/suppliers?search=${encodeURIComponent(search)}`, { headers: { Accept: "application/json" } });
    const data: unknown = await response.json().catch(() => null);
    return response.ok && Array.isArray(data) ? (data as SupplierOption[]) : [];
  } catch {
    return [];
  }
}

/**
 * Picks a supplier by searching the server as the user types (name, code or mobile; the first 20 matches).
 * With `onNewName`, the box also takes a name that isn't on file: text typed and left without picking (or
 * Enter with no match) is kept as the name, unless it is exactly an on-file supplier's name, which picks them.
 * The list sits in a portal, so a popup or a scrolling card doesn't clip it.
 */
export function SupplierPicker({
  id,
  value,
  newName = "",
  onChange,
  onNewName,
  newNameHint,
  loadingValue = false,
  required,
  disabled,
  placeholder = "Search name, code or mobile…",
}: {
  id?: string;
  value: SupplierOption | null;
  /** A name not on file chosen with `onNewName`. */
  newName?: string;
  onChange: (supplier: SupplierOption | null) => void;
  /** Allows a supplier that isn't on file, by name. */
  onNewName?: (name: string) => void;
  /** What leaving a name not on file does, shown when nothing matches, e.g. "Leave it typed to add them as a new supplier." */
  newNameHint?: string;
  /** The chosen supplier is still being loaded (e.g. a draft's). */
  loadingValue?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  // Inside a modal <dialog> the list must render in the dialog: the page outside it is inert and below the top layer.
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  // Whether the text was changed since the list opened (only then does leaving the box keep it as a name).
  const edited = useRef(false);
  // The search text the listed suppliers are for, and a ticket that drops a late name check once the box reopens.
  const itemsFor = useRef<string | null>(null);
  const settleRef = useRef(0);
  const listId = useId();

  const load = useCallback(async (search: string) => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/lookup/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);
      if (request !== requestRef.current) return;
      if (!response.ok || !Array.isArray(data)) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't load the suppliers.");
        return;
      }
      setItems(data as SupplierOption[]);
      itemsFor.current = search;
      setActive(0);
    } catch {
      if (request === requestRef.current) setError("Couldn't load the suppliers.");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  // The first suppliers as soon as the list opens, then a new search 250 ms after the user stops typing.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => load(query.trim()), query.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, query, load]);

  // Keeps the list under (or over) the input while the page scrolls or resizes.
  const place = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPlacement(
      window.innerHeight - rect.bottom < LIST_HEIGHT + 8 && rect.top > window.innerHeight - rect.bottom
        ? { left, width, bottom: window.innerHeight - rect.top + 4 }
        : { left, width, top: rect.bottom + 4 },
    );
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    setPortalTarget(inputRef.current?.closest("dialog") ?? document.body);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // Inactive suppliers can't be picked for a new document; the chosen one stays listed.
  const shown = items.filter((supplier) => supplier.isActive || supplier.id === value?.id);
  const typed = query.trim();

  function openList() {
    if (open || disabled) return;
    // A typed name opens for editing; a picked supplier opens an empty search.
    setQuery(value || !onNewName ? "" : newName);
    edited.current = false;
    settleRef.current++;
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery("");
    requestRef.current++;
    setLoading(false);
  }

  function pick(supplier: SupplierOption) {
    onChange(supplier);
    close();
  }

  /** The supplier named exactly `text` when there is one, else `text` as a name not on file. */
  function settle(text: string, suppliers: SupplierOption[]) {
    const match = suppliers.find((supplier) => supplier.isActive && supplier.name.toLowerCase() === text.toLowerCase());
    if (match) onChange(match);
    else onNewName?.(text.slice(0, 250));
  }

  /** Leaving the box: typed text that matches no supplier exactly becomes the name (with `onNewName`). */
  function keepTyped() {
    if (onNewName && edited.current) {
      if (!typed) {
        if (!value) onNewName("");
      } else if (itemsFor.current === typed) {
        settle(typed, shown);
      } else {
        // The list is still for older text (left before the search came back): ask the server first.
        const text = typed;
        const ticket = ++settleRef.current;
        void searchSuppliers(text).then((found) => ticket === settleRef.current && settle(text, found));
      }
    }
    close();
  }

  const display = value ? supplierLabel(value) : newName;
  const activeId = open && shown[active] ? `${listId}-${active}` : undefined;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        required={required}
        disabled={disabled}
        value={open ? query : display}
        placeholder={loadingValue ? "Loading the supplier…" : open && display ? display : placeholder}
        title={display || undefined}
        onFocus={openList}
        onClick={openList}
        onBlur={keepTyped}
        onChange={(event) => {
          edited.current = true;
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) openList();
            setActive((index) => Math.min(index + 1, Math.max(shown.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            if (!open) return;
            event.preventDefault();
            if (shown[active]) pick(shown[active]);
            else keepTyped();
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            close();
          }
        }}
        className="truncate pr-14"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
        {loading || loadingValue ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
      </span>
      {display && !required && !disabled && !open && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            onNewName?.("");
          }}
          className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-red-500"
          aria-label="Clear the supplier"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}

      {open &&
        placement &&
        portalTarget &&
        createPortal(
          <ul
            id={listId}
            role="listbox"
            // Keeps the focus in the input, so clicking an option or the scroll bar doesn't close the list.
            onMouseDown={(event) => event.preventDefault()}
            style={{ position: "fixed", left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom, maxHeight: LIST_HEIGHT }}
            className="z-[100000] overflow-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-900"
          >
            {shown.map((supplier, index) => (
              <li
                key={supplier.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(supplier)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-3 py-2",
                  index === active ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5",
                )}
              >
                <span className="min-w-0">
                  <span className={cn("block truncate text-gray-800 dark:text-white/90", supplier.id === value?.id && "font-medium")}>
                    {supplier.name}
                    {supplier.address && <span className="text-gray-600 dark:text-gray-300"> - {supplier.address}</span>}
                    {!supplier.isActive && <span className="text-gray-500"> (inactive)</span>}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {supplier.code}
                    {supplier.mobile && ` · ${supplier.mobile}`}
                  </span>
                </span>
                {supplier.balance !== 0 && (
                  <span className={cn("shrink-0 text-xs tabular-nums", supplier.balance > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500")}>
                    {supplier.balance > 0 ? `owed ${formatAmount(supplier.balance)}` : `adv ${formatAmount(-supplier.balance)}`}
                  </span>
                )}
              </li>
            ))}
            {error && <li className="px-3 py-2 text-red-600 dark:text-red-400">{error}</li>}
            {!error && !loading && shown.length === 0 && (
              <li className="px-3 py-2 text-gray-500 dark:text-gray-400">
                {typed
                  ? `No supplier on file matches “${typed}”.${onNewName && newNameHint ? ` ${newNameHint}` : ""}`
                  : "No suppliers yet. Add them under Purchase → Suppliers."}
              </li>
            )}
            {loading && shown.length === 0 && <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Searching…</li>}
            {!loading && items.length >= 20 && (
              <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">The first 20 matches: type more to narrow them down.</li>
            )}
          </ul>,
          portalTarget,
        )}
    </div>
  );
}
