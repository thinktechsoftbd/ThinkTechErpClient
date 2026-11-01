import { cn } from "@/core/utils/cn";
import { formatQuantity } from "@/core/utils/number";

/** Below this share of what it was allocated, an organization is running low. */
const LOW_SHARE = 0.1;

/**
 * SMS an organization has left: red when none are left, amber when running low, muted when it
 * never had any.
 */
export function SmsLeft({ left, allocated }: { left: number; allocated: number }) {
  if (allocated <= 0 && left <= 0) return <span className="text-gray-500 tabular-nums dark:text-gray-400">{formatQuantity(0)}</span>;

  const empty = left <= 0;
  const low = !empty && left < allocated * LOW_SHARE;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        empty ? "text-red-600 dark:text-red-400" : low ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-white/90",
      )}
    >
      {formatQuantity(left)}
      {(empty || low) && <span className="block text-xs font-normal">{empty ? "none left" : "running low"}</span>}
    </span>
  );
}
