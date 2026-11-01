"use client";

import { useState } from "react";
import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { todayIso } from "@/core/utils/number";

/**
 * Fields of "New count" (inside a FormModalButton). Rendered only when the dialog opens, so the
 * default date is the browser's today.
 */
export function NewCountFields({
  warehouses,
  categories,
  defaultWarehouseId,
}: {
  warehouses: { id: number; name: string }[];
  categories: { id: number; path: string }[];
  defaultWarehouseId: number | null;
}) {
  const [today] = useState(todayIso);
  const warehouseId = defaultWarehouseId && warehouses.some((w) => w.id === defaultWarehouseId) ? defaultWarehouseId : warehouses[0]?.id;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Count date" name="countDate" required>
        <Input id="countDate" name="countDate" type="date" defaultValue={today} required />
      </Field>
      <Field label="Warehouse" name="warehouseId" required>
        <Select id="warehouseId" name="warehouseId" defaultValue={warehouseId ?? ""} required>
          <option value="" disabled>
            Choose a warehouse
          </option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Category"
        name="categoryId"
        className="sm:col-span-2"
        hint="Count one section at a time if you like, e.g. only Pesticide."
      >
        <Select id="categoryId" name="categoryId" defaultValue="">
          <option value="">All products</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.path}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Checkbox name="includeZeroStock" label="Also list products with no stock in the system (to record any found)" />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          The system quantities are taken when you start. Serial-tracked products are left out.
        </p>
      </div>
      <Field label="Remarks" name="remarks" className="sm:col-span-2">
        <Textarea id="remarks" name="remarks" rows={2} maxLength={1000} placeholder="e.g. Month-end count of the shop" />
      </Field>
    </div>
  );
}
