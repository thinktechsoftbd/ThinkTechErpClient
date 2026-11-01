"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ProductSearch } from "@/core/documents/product-search";
import type { ProductLookupItem } from "@/modules/inventory/types";

/**
 * Picks the report's product: navigates to `basePath?product=<id>`, keeping the other query
 * values (and any not yet applied in the surrounding filter form) and starting from the first page.
 */
export function ReportProductPicker({
  basePath,
  placeholder = "Search product by name, code or barcode",
}: {
  basePath: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  function pick(product: ProductLookupItem) {
    const params = new URLSearchParams(window.location.search);
    const form = wrapperRef.current?.closest("form");
    if (form) {
      for (const [name, value] of new FormData(form)) {
        if (typeof value !== "string") continue;
        if (value) params.set(name, value);
        else params.delete(name);
      }
    }
    params.set("product", String(product.id));
    params.delete("offset");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div ref={wrapperRef} className="[&_input]:h-9">
      <ProductSearch onPick={pick} placeholder={placeholder} />
    </div>
  );
}
