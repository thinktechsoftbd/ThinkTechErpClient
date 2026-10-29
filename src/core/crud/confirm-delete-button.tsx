"use client";

import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/core/forms/action-state";
import { Alert } from "@/core/ui/alert";
import { Button, buttonClasses } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { cn } from "@/core/utils/cn";

/**
 * Row "Delete" action that asks for confirmation in a modal, then runs the Server Action.
 * API refusals (e.g. "still in use") are shown in the dialog instead of closing it.
 */
export function ConfirmDeleteButton({
  action,
  itemLabel,
  message,
}: {
  action: () => Promise<ActionState>;
  /** What is being deleted, e.g. `lookup table "Currency"`. */
  itemLabel: string;
  message?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <Trash2 className="size-4" aria-hidden /> Delete
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Confirm delete" size="sm">
        <div className="space-y-5">
          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-800 dark:text-white/90">Delete {itemLabel}?</p>
              <p className="text-gray-500 dark:text-gray-400">{message ?? "This cannot be undone."}</p>
            </div>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <button
              type="button"
              disabled={pending}
              className={cn(buttonClasses("danger"), "min-w-28")}
              onClick={() =>
                startTransition(async () => {
                  const result = await action();
                  if (result.status === "error") setError(result.message);
                  else setOpen(false);
                })
              }
            >
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
