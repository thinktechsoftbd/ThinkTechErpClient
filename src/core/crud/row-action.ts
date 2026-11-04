import { cn } from "@/core/utils/cn";

/**
 * The colours of a list row's actions, so they're told apart at a glance: edit blue, view (ledger, a related
 * list) sky, positive (post, collect, allocate) green, add violet, undo or correct amber, delete red. Each tone
 * carries its own text colour: cn doesn't merge classes, so there is no gray base for it to override.
 */
export const rowActionTones = {
  neutral: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
  edit: "text-brand-500 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10",
  view: "text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10",
  positive: "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10",
  add: "text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10",
  warn: "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10",
  delete: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
} as const;

export type RowActionTone = keyof typeof rowActionTones;

/** A row action with an icon and a label (Edit, Ledger, Delete, …). */
export function rowAction(tone: RowActionTone) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition disabled:opacity-60",
    rowActionTones[tone],
  );
}

/** A row action that is only an icon (e.g. the vouchers list). */
export function rowIconAction(tone: RowActionTone) {
  return cn("inline-flex size-8 items-center justify-center rounded-lg transition disabled:opacity-50", rowActionTones[tone]);
}
