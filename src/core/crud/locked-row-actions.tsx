import { Pencil, Trash2 } from "lucide-react";

const locked = "inline-flex size-8 cursor-not-allowed items-center justify-center rounded-lg text-gray-300 dark:text-gray-600";

/**
 * The Edit and Delete icons of a row that can't be changed (e.g. a posted document), greyed out, with `reason`
 * as their tooltip, so every row shows the same actions and says why these don't apply.
 */
export function LockedRowActions({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={locked} title={reason} role="img" aria-label={`Edit unavailable: ${reason}`}>
        <Pencil className="size-4" aria-hidden />
      </span>
      <span className={locked} title={reason} role="img" aria-label={`Delete unavailable: ${reason}`}>
        <Trash2 className="size-4" aria-hidden />
      </span>
    </span>
  );
}
