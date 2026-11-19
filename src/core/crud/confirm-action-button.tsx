"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/core/forms/action-state";
import { Alert } from "@/core/ui/alert";
import { Button, buttonClasses } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { cn } from "@/core/utils/cn";
import { rowIconAction, type RowActionTone } from "./row-action";

/**
 * An icon-only row action that asks for confirmation in a modal, then runs a Server Action (e.g. deactivate a
 * user). The action should call refresh() so the list updates; a refusal is shown in the dialog.
 */
export function ConfirmActionButton({
  action,
  label,
  icon,
  tone,
  title,
  message,
  confirmLabel,
  pendingLabel,
  danger = false,
}: {
  action: () => Promise<ActionState>;
  /** The button's tooltip and accessible name, e.g. "Deactivate Farhad Hossain". */
  label: string;
  icon: ReactNode;
  tone: RowActionTone;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  /** A red confirm button (for actions that take something away). */
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
        className={rowIconAction(tone)}
      >
        {icon}
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={title} size="sm">
        <div className="space-y-5">
          <div className="text-sm text-gray-600 dark:text-gray-300">{message}</div>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <button
              type="button"
              disabled={pending}
              className={cn(buttonClasses(danger ? "danger" : "primary"), "min-w-28")}
              onClick={() =>
                startTransition(async () => {
                  const result = await action();
                  if (result.status === "error") setError(result.message);
                  else setOpen(false);
                })
              }
            >
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
