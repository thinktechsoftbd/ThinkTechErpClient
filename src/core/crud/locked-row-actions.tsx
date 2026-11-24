import { Lock } from "lucide-react";

/**
 * Shown instead of Edit and Delete on a row that can't be changed (e.g. a posted document): a blue "Locked"
 * marker whose tooltip (`reason`) says why and what to do instead.
 */
export function LockedRowActions({ reason }: { reason: string }) {
  return (
    <span
      title={reason}
      className="inline-flex cursor-help items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
    >
      <Lock className="size-3.5" aria-hidden />
      Locked
      <span className="sr-only">: {reason}</span>
    </span>
  );
}
