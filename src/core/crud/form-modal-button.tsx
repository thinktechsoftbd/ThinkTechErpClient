"use client";

import { Pencil, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Button, buttonClasses } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { cn } from "@/core/utils/cn";

export const rowActionClass =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";

/**
 * A button that opens a modal holding a form bound to a Server Action ("add" or "edit").
 * The form is mounted fresh on every open, and the modal closes when the action succeeds;
 * the action should call refresh() so the list behind it updates.
 */
export function FormModalButton({
  mode,
  label,
  title,
  description,
  action,
  submitLabel = "Save",
  size,
  children,
}: {
  /** "create": primary toolbar button; "edit": compact row action. */
  mode: "create" | "edit";
  label: string;
  title: ReactNode;
  description?: ReactNode;
  action: FormAction;
  submitLabel?: string;
  size?: "sm" | "md" | "lg";
  /** The form fields (rendered inside the modal's form). */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setVersion((value) => value + 1);
          setOpen(true);
        }}
        className={mode === "create" ? buttonClasses("primary") : rowActionClass}
      >
        {mode === "create" ? <Plus className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        <ActionForm key={version} action={action} onSuccess={() => setOpen(false)} className="space-y-5">
          <FormMessage />
          {children}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton className={cn("min-w-28")}>{submitLabel}</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}
