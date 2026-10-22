"use client";

import { useState } from "react";
import { Input } from "@/core/forms/fields";
import { LucideIcon, resolveIconName } from "@/core/ui/lucide-icon";

/** Icon name input with a live preview of the Lucide icon it resolves to. */
export function MenuIconField({ defaultValue }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const known = !value.trim() || resolveIconName(value) !== undefined;

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-300">
          {value.trim() ? <LucideIcon name={value} className="size-5" /> : <span className="text-xs text-gray-400">—</span>}
        </span>
        <Input
          id="icon"
          name="icon"
          maxLength={100}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. layout-dashboard"
          autoComplete="off"
          className="font-mono"
        />
      </div>
      {!known && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          Not a known Lucide icon; the sidebar will show a circle instead.
        </p>
      )}
    </>
  );
}
