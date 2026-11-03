"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input, Label, Select } from "@/core/forms/fields";
import { cn } from "@/core/utils/cn";
import type { PaymentSource } from "@/modules/inventory/types";

/**
 * Payment Source picker for a purchase invoice: a searchable box over the server-side payment
 * sources, and its cascading "Source Type" select (the chosen source's lines). The selected line id
 * is the value saved as `invPaymentSourceDId`.
 */
export function PaymentSourceFields({
  dId,
  onChange,
  initialSourceId = null,
  initialName,
}: {
  dId: number | null;
  onChange: (dId: number | null) => void;
  /** Editing: the saved source's header id, loaded so its types are available. */
  initialSourceId?: number | null;
  initialName?: string;
}) {
  const [selected, setSelected] = useState<PaymentSource | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaymentSource[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Editing an invoice: load its saved source (with its lines) so the type list is present.
  useEffect(() => {
    if (!initialSourceId) return;
    let cancelled = false;
    fetch(`/api/lookup/payment-sources?id=${initialSourceId}`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: PaymentSource[]) => {
        if (!cancelled && Array.isArray(data) && data[0]) setSelected(data[0]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialSourceId]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 1) return;
    const request = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/lookup/payment-sources?search=${encodeURIComponent(text)}`, {
          headers: { Accept: "application/json" },
        });
        const data = response.ok ? await response.json() : [];
        if (request !== requestRef.current) return;
        setResults(Array.isArray(data) ? (data as PaymentSource[]) : []);
        setOpen(true);
      } catch {
        if (request === requestRef.current) setResults([]);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(source: PaymentSource) {
    setSelected(source);
    setQuery("");
    setResults([]);
    setOpen(false);
    // One type: use it straight away; else leave the type for the user to choose.
    onChange(source.lines.length === 1 ? source.lines[0].id : null);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setResults([]);
    onChange(null);
  }

  const lines = selected?.lines ?? [];

  return (
    <div className="space-y-4">
      <div ref={wrapperRef} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <Input
          id="invPaymentSourceDId"
          value={open ? query : selected ? selected.nameEn : query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          placeholder={initialName ? `Current: ${initialName}` : "Search a payment source (Cash, a bank, bKash…)"}
          aria-label="Search payment sources"
          aria-autocomplete="list"
          className="pr-9 pl-9"
        />
        <span className="absolute top-1/2 right-2 -translate-y-1/2">
          {loading ? (
            <LoaderCircle className="size-4 animate-spin text-gray-400" aria-hidden />
          ) : selected ? (
            <button type="button" onClick={clear} aria-label="Change payment source" className="text-gray-400 hover:text-gray-600">
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <Search className="size-4 text-gray-400" aria-hidden />
          )}
        </span>
        {open && query.trim() && !loading && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
          >
            {results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No payment source matches “{query.trim()}”.</li>
            ) : (
              results.map((source) => (
                <li key={source.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => pick(source)}
                    className={cn("flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-800 dark:text-white/90">
                        {source.nameEn}
                        {source.nameLocal && <span className="ml-2 font-normal text-gray-500">{source.nameLocal}</span>}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {source.lines.length} source type{source.lines.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div>
        <Label htmlFor="invPaymentSourceType">
          Source Type <span className="text-red-500">*</span>
        </Label>
        <Select
          id="invPaymentSourceType"
          value={dId ?? ""}
          disabled={!selected}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">
            {selected ? (lines.length ? "Choose the source type" : "This source has no types") : "Choose a payment source first"}
          </option>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.paymentFor}
              {line.accountName ? ` · ${line.accountName}` : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
