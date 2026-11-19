"use client";

import { Pencil, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Button, buttonClasses } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { cn } from "@/core/utils/cn";
import { rowAction, rowIconAction, type RowActionTone } from "./row-action";

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
  compact = false,
  defaultOpen = false,
  tone = "edit",
  icon,
  variant = "primary",
  buttonSize = "md",
  iconOnly = false,
  triggerClassName,
  children,
}: {
  /** The trigger's own look instead of a button's, e.g. a link-styled code in a table cell (with icon={null}). */
  triggerClassName?: string;
  /** Mode "edit": only the icon (the label becomes its tooltip and accessible name). */
  iconOnly?: boolean;
  /** "create": primary toolbar button; "edit": compact row action. */
  mode: "create" | "edit";
  /** The row action's colour (mode "edit"), e.g. "add" for a row action that adds something. */
  tone?: RowActionTone;
  label: string;
  title: ReactNode;
  description?: ReactNode;
  action: FormAction;
  submitLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
<<<<<<< HEAD
=======
  /** Tighter spacing (see Modal), for a big form that should fit without scrolling. */
  compact?: boolean;
>>>>>>> 26a266bbb55001d97b565be6f3d620e9021cbc60
  /** Open the modal when the button first renders, e.g. for a page linked with ?new=1. */
  defaultOpen?: boolean;
  /** The button's icon, e.g. <Wrench className="size-4" /> (default: Plus for "create", Pencil for "edit"); null for none. */
  icon?: ReactNode;
  /** The look of a "create" (toolbar) button. */
  variant?: "primary" | "outline" | "danger";
  /** The size of a "create" button, e.g. "sm" among a page header's document actions. */
  buttonSize?: "sm" | "md";
  /** The form fields (rendered inside the modal's form). */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [version, setVersion] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setVersion((value) => value + 1);
          setOpen(true);
        }}
        className={
          triggerClassName ?? (mode === "create" ? buttonClasses(variant, buttonSize) : iconOnly ? rowIconAction(tone) : rowAction(tone))
        }
        title={iconOnly ? label : undefined}
        aria-label={iconOnly ? label : undefined}
      >
        {icon === undefined ? (
          mode === "create" ? <Plus className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />
        ) : (
          icon
        )}
        {!iconOnly && label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size={size} compact={compact}>
        <ActionForm key={version} action={action} onSuccess={() => setOpen(false)} className={compact ? "space-y-3" : "space-y-5"}>
          <FormMessage />
          {children}
          <div className={cn("flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800", compact ? "pt-3" : "pt-5")}>
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
