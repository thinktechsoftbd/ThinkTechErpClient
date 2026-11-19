"use client";

import { X } from "lucide-react";
import { useEffectEvent, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/core/utils/cn";

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  /** Wide forms: three fields per row plus a side column (e.g. the user popup). */
  wide: "max-w-5xl",
  /** Nearly the whole screen, for a form laid out in columns (e.g. a product with its images). */
  xl: "max-w-[96rem]",
};

/**
 * Accessible modal built on the native <dialog>: focus is trapped, Escape or the close button closes
 * it, and the page behind is inert while it's open. A click outside it does nothing, so a half-filled
 * form isn't lost to a stray click.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  compact = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof sizes;
  /** Tighter header and body padding, so a big form fits on a laptop screen without scrolling. */
  compact?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const notifyClose = useEffectEvent(() => onClose());

  // A layout effect with a cleanup, so it also works when Next.js keeps the page hidden (React <Activity>)
  // instead of unmounting it: the cleanup closes the dialog before it is hidden, and showing the page again
  // reopens it as a modal. Left open, it could come back as a plain box in the page: moving an open
  // dialog's node (as React does with kept routes) drops its modal state.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (dialog.open && !dialog.matches(":modal")) dialog.close();
    if (!dialog.open) dialog.showModal();
    // Start in the first field rather than on the close button.
    bodyRef.current
      ?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])")
      ?.focus();

    // Escape closed it: tell the owner. Closing it from the cleanup (or just above) is not reported.
    const closedByUser = () => {
      if (!dialog.open) notifyClose();
    };
    dialog.addEventListener("close", closedByUser);
    return () => {
      dialog.removeEventListener("close", closedByUser);
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn(
        "m-auto w-[calc(100%-2rem)] overflow-visible rounded-2xl border border-gray-200 bg-white p-0 text-left text-gray-800 shadow-theme-lg",
        "backdrop:bg-gray-900/50 backdrop:backdrop-blur-[2px] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100",
        sizes[size],
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div
            className={cn(
              "flex justify-between gap-4 border-b border-gray-100 dark:border-gray-800",
              compact ? "items-center px-5 py-2.5" : "items-start px-6 py-4",
            )}
          >
            <div className={cn("min-w-0", compact && "flex flex-wrap items-baseline gap-x-3")}>
              <h2 className={cn("font-semibold text-gray-800 dark:text-white/90", compact ? "text-base" : "text-lg")}>{title}</h2>
              {description && <p className={cn("text-sm text-gray-500 dark:text-gray-400", !compact && "mt-1")}>{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "-mr-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5",
                compact ? "p-1.5" : "p-2",
              )}
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div ref={bodyRef} className={cn("custom-scrollbar overflow-y-auto", compact ? "px-5 py-3" : "px-6 py-5")}>
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
