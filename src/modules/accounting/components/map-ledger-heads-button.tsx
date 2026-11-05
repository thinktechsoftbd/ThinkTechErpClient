"use client";

import { Link2, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { mapLedgerHeadsAction } from "../actions/map-ledger-heads";
import type { LedgerHeadOption } from "../types";
import type { UnmappedHead } from "../voucher-mappings";
import { LedgerHeadPicker } from "./ledger-head-picker";

const kindLabel: Record<UnmappedHead["kind"], string> = { category: "Category", supplier: "Supplier", customer: "Customer" };

/**
 * "Map" beside a failed finalize: a small popup with each item category, supplier or customer that has no
 * ledger head, and a ledger head picker for each. Saving maps them; the invoice can then be finalized again.
 */
export function MapLedgerHeadsButton({ items }: { items: UnmappedHead[] }) {
  const [open, setOpen] = useState(false);
  const [heads, setHeads] = useState<Record<string, LedgerHeadOption | null>>({});
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const keyOf = (item: UnmappedHead) => `${item.kind}-${item.id}`;
  const allChosen = items.every((item) => heads[keyOf(item)]);

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await mapLedgerHeadsAction(
        items.map((item) => ({ kind: item.kind, id: item.id, accSubClassId: heads[keyOf(item)]?.id ?? 0 })),
      );
      if (result.status === "error") setError(result.message);
      else {
        setDone(true);
        setOpen(false);
      }
    });
  }

  if (done) return <span className="shrink-0 text-sm font-medium text-green-700 dark:text-green-400">Mapped. Finalize again.</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-brand-600 shadow-theme-xs ring-1 ring-brand-200 transition hover:bg-brand-50 dark:bg-gray-900 dark:text-brand-400 dark:ring-brand-500/30 dark:hover:bg-brand-500/10"
      >
        <Link2 className="size-4" aria-hidden /> Map
      </button>
      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Map ledger heads"
        description="Choose the ledger head each one posts to."
        size="md"
      >
        <div className="space-y-4">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={keyOf(item)} className="space-y-1.5">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  <span className="mr-1.5 rounded bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
                    {kindLabel[item.kind]}
                  </span>
                  {item.name}
                  {item.detail && item.detail !== item.name && (
                    <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">{item.detail}</span>
                  )}
                </p>
                <LedgerHeadPicker
                  value={heads[keyOf(item)] ?? null}
                  onChange={(head) => setHeads((current) => ({ ...current, [keyOf(item)]: head }))}
                  aria-label={`Ledger head for ${item.name}`}
                />
              </li>
            ))}
          </ul>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !allChosen} className="min-w-28">
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {pending ? "Saving…" : "Save mapping"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
