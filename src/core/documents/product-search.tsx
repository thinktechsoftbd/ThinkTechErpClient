"use client";

import { LoaderCircle, ScanBarcode, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/core/forms/fields";
import { cn } from "@/core/utils/cn";
import { formatQuantity } from "@/core/utils/number";
import type { ProductLookupItem } from "@/modules/inventory/types";

/**
 * Product search for document lines: type a code, name or Bangla name, or scan a barcode and press
 * Enter (an exact barcode or code match is added at once).
 */
export function ProductSearch({
  onPick,
  stockOnly = false,
  warehouseId,
  placeholder = "Search product by name, code or scan a barcode",
  disabled,
}: {
  onPick: (product: ProductLookupItem) => void;
  stockOnly?: boolean;
  warehouseId?: number | null;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductLookupItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [active, setActive] = useState(0);
  const requestRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 1) return;
    const request = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const params = new URLSearchParams({ search: text, stockOnly: String(stockOnly) });
        if (warehouseId) params.set("warehouseId", String(warehouseId));
        const response = await fetch(`/api/lookup/products?${params}`, { headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => null);
        if (request !== requestRef.current) return;
        if (!response.ok || !Array.isArray(data)) {
          setError((data && typeof data.error === "string" && data.error) || "Couldn't search products.");
          setResults([]);
        } else {
          setResults(data as ProductLookupItem[]);
          setActive(0);
          setOpen(true);
        }
      } catch {
        if (request === requestRef.current) setError("Couldn't reach the server.");
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, stockOnly, warehouseId]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(product: ProductLookupItem) {
    onPick(product);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <Input
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            // Never submit the document form from the search box.
            event.preventDefault();
            const text = query.trim().toLowerCase();
            const exact = results.find((p) => p.matchedBarcode || p.code.toLowerCase() === text);
            if (exact) pick(exact);
            else if (open && results[active]) pick(results[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        aria-label="Search products"
        aria-autocomplete="list"
        className="pr-9 pl-9"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
        {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ScanBarcode className="size-4" aria-hidden />}
      </span>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {open && query.trim() && !loading && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No products match “{query.trim()}”.</li>
          ) : (
            results.map((product, index) => (
              <li key={product.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(product)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm",
                    index === active ? "bg-gray-100 dark:bg-white/5" : "",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-800 dark:text-white/90">
                      {product.name}
                      {product.nameLocal && <span className="ml-2 font-normal text-gray-500">{product.nameLocal}</span>}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {product.code}
                      {product.matchedBarcode && ` · barcode ${product.matchedBarcode}`}
                      {product.trackingType !== "None" && ` · ${product.trackingType} tracked`}
                    </span>
                  </span>
                  {product.productType === "Stock" && (
                    <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                      {formatQuantity(product.stockQuantity)} {product.baseUnitCode}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
