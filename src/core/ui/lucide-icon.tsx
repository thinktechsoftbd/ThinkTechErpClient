"use client";

import { Circle } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";

const knownIcons = new Set<string>(iconNames);

/** Resolves a stored icon name ("layout-dashboard" or "LayoutDashboard"); undefined when unknown. */
export function resolveIconName(icon: string | null | undefined): IconName | undefined {
  const name = icon?.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return name && knownIcons.has(name) ? (name as IconName) : undefined;
}

/** A Lucide icon chosen by name at runtime (e.g. from the menu table); a circle when the name is unknown. */
export function LucideIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const resolved = resolveIconName(name);
  if (!resolved) return <Circle className={className} aria-hidden />;
  // Icons load on demand; keep their space while they do.
  return (
    <DynamicIcon
      name={resolved}
      className={className}
      aria-hidden
      fallback={() => <span className={`inline-block ${className ?? ""}`} aria-hidden />}
    />
  );
}
