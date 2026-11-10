"use client";

import { useState } from "react";
import { cn } from "@/core/utils/cn";

/** Up to two letters from a name: "Think Tech" → "TT", "kdip285@gmail.com" → "KG". */
export function initials(name: string) {
  const parts = name.split(/[\s._@-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** A round photo (e.g. a user's photoUrl), or the name's initials when there is none or it can't load. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const showPhoto = Boolean(src) && src !== failedSrc;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300",
        className,
      )}
    >
      {showPhoto ? (
        // A file on the API's storage: next/image would need its host configured.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt="" className="size-full object-cover" onError={() => setFailedSrc(src!)} />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
