"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Select } from "@/core/forms/fields";
import { Alert } from "@/core/ui/alert";
import { Badge } from "@/core/ui/badge";
import { buttonClasses } from "@/core/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { assignProductPolicyAction } from "../actions/policies";
import type { ProductWarrantyItem, WarrantyPolicyOption } from "../types";

const muted = "text-gray-500 dark:text-gray-400";

/**
 * Products with the warranty they are sold with. Tick products (or the whole page), pick a policy and apply it;
 * "No warranty" takes it off. Later sales issue cards with the new policy; cards already issued don't change.
 */
export function ProductWarrantyTable({
  rows,
  policies,
  canManage,
}: {
  rows: ProductWarrantyItem[];
  policies: WarrantyPolicyOption[];
  canManage: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [policy, setPolicy] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string }>();
  const allChecked = rows.length > 0 && rows.every((row) => selected.has(row.productId));

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply(ids: number[], policyValue: string) {
    setResult(undefined);
    startTransition(async () => {
      const state = await assignProductPolicyAction(ids, policyValue === "none" ? null : Number(policyValue));
      setResult({ tone: state.status === "error" ? "error" : "success", message: state.message ?? "" });
      if (state.status !== "error") setSelected(new Set());
    });
  }

  return (
    <>
      {canManage && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <span className={`text-sm ${muted}`}>{selected.size > 0 ? `${selected.size} selected` : "Tick products to set their warranty"}</span>
          <div className="w-64">
            <Select value={policy} onChange={(event) => setPolicy(event.target.value)} aria-label="Warranty policy">
              <option value="">Choose a policy…</option>
              {policies.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="none">No warranty</option>
            </Select>
          </div>
          <button
            type="button"
            disabled={pending || selected.size === 0 || !policy}
            onClick={() => apply([...selected], policy)}
            className={buttonClasses("primary", "sm")}
          >
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Apply to selected
          </button>
          {result && (
            <Alert tone={result.tone} className="w-full py-2">
              {result.message}
            </Alert>
          )}
        </div>
      )}
      <Table>
        <THead>
          <tr>
            {canManage && (
              <TH className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  className="size-4 accent-brand-500"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((row) => row.productId)))}
                />
              </TH>
            )}
            <TH>Product</TH>
            <TH>Category / brand</TH>
            <TH>Tracking</TH>
            <TH>Warranty</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.productId}>
              {canManage && (
                <TD>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.productName}`}
                    className="size-4 accent-brand-500"
                    checked={selected.has(row.productId)}
                    onChange={() => toggle(row.productId)}
                  />
                </TD>
              )}
              <TD>
                <span className="font-medium text-gray-800 dark:text-white/90">{row.productName}</span>
                <span className={`block text-xs ${muted}`}>
                  {row.productCode}
                  {!row.isActive && " · inactive"}
                </span>
              </TD>
              <TD className={muted}>{[row.categoryName, row.brandName].filter(Boolean).join(" / ") || "—"}</TD>
              <TD>
                {row.productType !== "Stock" ? (
                  <Badge>{row.productType === "Service" ? "Service" : "Non-stock"}</Badge>
                ) : row.trackingType === "Serial" ? (
                  <Badge tone="brand">Serial no.</Badge>
                ) : (
                  <span className={muted}>{row.trackingType === "Batch" ? "Batch" : "Quantity"}</span>
                )}
              </TD>
              <TD>
                {row.warrantyPolicyName ? (
                  <Badge tone="success">{row.warrantyPolicyName}</Badge>
                ) : (
                  <span className={muted}>No warranty</span>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
