"use client";

import { LoaderCircle, Pencil } from "lucide-react";
import { startTransition, useState } from "react";
import { rowActionClass } from "@/core/crud/form-modal-button";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Alert } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import type { Product } from "../../types";
import { ProductForm, type ProductFormOptions } from "./product-form";

/** What loadProductAction returns. */
export type ProductLoadResult = { status: "success"; product: Product } | { status: "error"; message: string };

/**
 * Row "Edit" action for a product. List rows don't carry packs and barcodes, so the modal loads
 * the full product first (loadProductAction), then shows the form bound to saveProductAction.
 */
export function ProductEditButton({
  productLabel,
  load,
  action,
  options,
}: {
  /** e.g. "FERT-UREA · Urea 50 kg", shown under the title. */
  productLabel: string;
  load: () => Promise<ProductLoadResult>;
  action: FormAction;
  options: ProductFormOptions;
}) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  // Tagged with the open it belongs to, so a slow load can't fill a later open.
  const [loaded, setLoaded] = useState<{ version: number; result: ProductLoadResult } | null>(null);
  const result = loaded?.version === version ? loaded.result : null;

  function openEditor() {
    const next = version + 1;
    setVersion(next);
    setOpen(true);
    startTransition(async () => {
      const loadedResult = await load();
      startTransition(() => setLoaded({ version: next, result: loadedResult }));
    });
  }

  return (
    <>
      <button type="button" onClick={openEditor} className={rowActionClass}>
        <Pencil className="size-4" aria-hidden />
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit product" description={productLabel} size="lg">
        {!result ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500 dark:text-gray-400" aria-busy="true">
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading product…
          </p>
        ) : result.status === "error" ? (
          <div className="space-y-5">
            <Alert tone="error">{result.message}</Alert>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <ActionForm key={version} action={action} onSuccess={() => setOpen(false)} className="space-y-5">
            <FormMessage />
            <ProductForm value={result.product} options={options} />
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitButton className="min-w-28">Save changes</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
