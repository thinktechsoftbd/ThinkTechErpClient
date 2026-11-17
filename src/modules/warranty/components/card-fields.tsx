"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { ProductSearch } from "@/core/documents/product-search";
import { Field, Input, Select } from "@/core/forms/fields";
import { CustomerPicker } from "@/modules/sales/components/customer-picker";
import type { CustomerOption } from "@/modules/sales/types";
import type { WarrantyPolicyOption } from "../types";

const muted = "text-gray-500 dark:text-gray-400";

/**
 * Fields of the manual warranty card modal: a unit sold before the system went live. The warranty runs from the date of
 * sale for the product's policy (or the one chosen), unless an end date is entered.
 */
export function ManualCardFields({ policies }: { policies: WarrantyPolicyOption[] }) {
  const [product, setProduct] = useState<{ id: number; name: string; code: string; serial: boolean } | null>(null);
  const [customer, setCustomer] = useState<CustomerOption | null>(null);

  return (
    <>
      <input type="hidden" name="productId" value={product?.id ?? ""} />
      <input type="hidden" name="customerId" value={customer?.id ?? ""} />
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
          <ProductSearch onPick={(p) => setProduct({ id: p.id, name: p.name, code: p.code, serial: p.trackingType === "Serial" })} placeholder="Search product by name or code" />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Serial no." name="serialNo" hint={product?.serial ? "As printed on the unit." : "If the unit has one."}>
          <Input id="serialNo" name="serialNo" maxLength={100} />
        </Field>
        <Field label="Units" name="quantity" hint="1 for a card with a serial number.">
          <Input id="quantity" name="quantity" inputMode="decimal" defaultValue="1" />
        </Field>
      </div>
      <div className="space-y-3">
        <CustomerPicker value={customer} onChange={setCustomer} canAdd={false} includeSuppliers endpoint="/api/lookup/warranty-customers" />
        {!customer && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" name="customerName">
              <Input id="customerName" name="customerName" maxLength={250} />
            </Field>
            <Field label="Mobile" name="customerMobile">
              <Input id="customerMobile" name="customerMobile" maxLength={30} inputMode="tel" />
            </Field>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date of sale" name="startDate" required>
          <Input id="startDate" name="startDate" type="date" required />
        </Field>
        <Field label="Policy" name="warrantyPolicyId" hint="Empty: the product's.">
          <Select id="warrantyPolicyId" name="warrantyPolicyId" defaultValue="">
            <option value="">Product&apos;s policy</option>
            {policies.filter((p) => p.isActive).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Warranty ends" name="endDate" hint="Empty: from the policy.">
          <Input id="endDate" name="endDate" type="date" />
        </Field>
      </div>
      <Field label="Remarks" name="remarks">
        <Input id="remarks" name="remarks" maxLength={1000} placeholder="e.g. old memo no." />
      </Field>
    </>
  );
}
