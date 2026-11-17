"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { ProductSearch } from "@/core/documents/product-search";
import { Field, Input, Textarea } from "@/core/forms/fields";
import type { SupplierOption } from "../types";
import { ClaimDates, SupplierSelect } from "./job-action-fields";

const muted = "text-gray-500 dark:text-gray-400";

/** Fields of a claim for stock that failed before it was sold (no service job): the product, its serial and the fault. */
export function StockClaimFields({ suppliers }: { suppliers: SupplierOption[] }) {
  const [product, setProduct] = useState<{ id: number; name: string; code: string } | null>(null);
  return (
    <>
      <input type="hidden" name="productId" value={product?.id ?? ""} />
      <SupplierSelect suppliers={suppliers} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product" name="productId" required>
          {product ? (
            <div className="flex h-9 items-center justify-between rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700">
              <span className="truncate text-gray-800 dark:text-white/90">
                {product.name} <span className={muted}>({product.code})</span>
              </span>
              <button type="button" aria-label="Remove product" onClick={() => setProduct(null)} className="text-gray-400 hover:text-red-500">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <ProductSearch onPick={(p) => setProduct({ id: p.id, name: p.name, code: p.code })} placeholder="Search product" />
          )}
        </Field>
        <Field label="Serial no." name="serialNo">
          <Input id="serialNo" name="serialNo" maxLength={100} />
        </Field>
      </div>
      <Field label="Fault" name="problemDescription" required>
        <Textarea id="problemDescription" name="problemDescription" rows={2} maxLength={2000} required />
      </Field>
      <ClaimDates />
    </>
  );
}
