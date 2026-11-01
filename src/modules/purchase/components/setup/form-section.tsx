import type { ReactNode } from "react";
import type { LookupOption } from "@/modules/settings/types";

/** A titled group of fields inside a large add/edit modal, laid out in two columns. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-gray-200 px-4 pt-2 pb-4 sm:px-5 sm:pb-5 dark:border-gray-800">
      <legend className="px-1.5 text-sm font-semibold text-gray-800 dark:text-white/90">{title}</legend>
      {description && <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * Lookup options (active values only) plus the record's current value when it is no longer
 * among them, so editing doesn't silently clear it.
 */
export function withCurrentOption(options: LookupOption[], id: number | null | undefined, name: string | null | undefined) {
  if (!id || options.some((option) => option.id === id)) return options;
  return [...options, { id, name: `${name ?? `#${id}`} (inactive)` }];
}
