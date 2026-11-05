"use client";

import { Link2, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { mapCategoryLedgerHeadsAction } from "@/modules/inventory/actions/setup";
import type { LedgerHeadOption } from "../types";
import type { UnmappedCategory } from "../voucher-mappings";
import { LedgerHeadPicker } from "./ledger-head-picker";

/**
 * "Map" beside a failed finalize: a small popup with each category that has no ledger head and a ledger head
 * picker for it. Saving maps them; the invoice can then be finalized again.
 */
export function MapCategoryHeadsButton({ categories }: { categories: UnmappedCategory[] }) {
  const [open, setOpen] = useState(false);
  const [heads, setHeads] = useState<Record<number, LedgerHeadOption | null>>({});
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const allChosen = categories.every((category) => heads[category.id]);

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await mapCategoryLedgerHeadsAction(
        categories.map((category) => ({ categoryId: category.id, accSubClassId: heads[category.id]?.id ?? 0 })),
      );
      if (result.status === "error") setError(result.message);
      else {
        setDone(true);
        setOpen(false);
      }
    });
  }

  if (done) return <span className="shrink-0 text-sm font-medium text-green-700 dark:text-green-400">Mapped. Save &amp; finalize again.</span>;

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
        description="Each item category needs the ledger head its amount posts to."
        size="md"
      >
        <div className="space-y-4">
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category.id} className="space-y-1.5">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {category.name}
                  {category.path !== category.name && (
                    <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">{category.path}</span>
                  )}
                </p>
                <LedgerHeadPicker
                  value={heads[category.id] ?? null}
                  onChange={(head) => setHeads((current) => ({ ...current, [category.id]: head }))}
                  aria-label={`Ledger head for ${category.name}`}
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
