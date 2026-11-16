"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { appConfig } from "@/core/config/app";
import { cn } from "@/core/utils/cn";
import { useSidebar } from "./sidebar-context";

/** The organization a brand shows; without one (dev sign-in, or while loading) it is the app's own. */
export type BrandOrganization = { name: string; logoUrl: string | null };

/** "M/S Akhi Enterprise" -> "AE", "ThinkTech" -> "TT", "Rangpur" -> "R". */
function initials(name: string) {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const longWords = words.filter((word) => word.length > 1);
  const picked = (longWords.length > 0 ? longWords : words).slice(0, 2);
  if (picked.length === 1) {
    const capitals = picked[0].match(/\p{Lu}/gu) ?? [];
    return (capitals.length >= 2 ? capitals.slice(0, 2).join("") : picked[0][0]).toUpperCase();
  }
  return picked.map((word) => word[0]).join("").toUpperCase();
}

/**
 * The organization's logo, else its initials, else the app's mark. A logo keeps the mark's height and its own
 * shape, up to 112px wide ("wide", where its name has room) or 56px ("square", the collapsed sidebar).
 */
export function BrandMark({
  organization,
  fit = "wide",
  className,
}: {
  organization?: BrandOrganization | null;
  fit?: "wide" | "square";
  className?: string;
}) {
  // A logo that fails to load (deleted, storage down) falls back to the initials.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const logoUrl = organization?.logoUrl && organization.logoUrl !== brokenUrl ? organization.logoUrl : null;

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- the logo comes from the API's file storage, any size
      <img
        src={logoUrl}
        alt=""
        onError={() => setBrokenUrl(logoUrl)}
        className={cn(
          "h-9 w-auto min-w-9 shrink-0 rounded-lg bg-white object-contain p-0.5 ring-1 ring-gray-200 dark:ring-gray-700",
          fit === "wide" ? "max-w-28" : "max-w-14",
          className,
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white",
        className,
      )}
    >
      {organization ? initials(organization.name) || appConfig.shortName : appConfig.shortName}
    </span>
  );
}

/** The sidebar's top: the organization the user works in (its logo and name), linking to the home page. */
export function SidebarBrand({ organization }: { organization?: BrandOrganization | null }) {
  const { isExpanded, isMobileOpen } = useSidebar();
  const showLabels = isExpanded || isMobileOpen;
  const name = organization?.name ?? appConfig.name;

  return (
    <Link href={appConfig.homePath} aria-label={name} title={name} className="flex min-w-0 items-center gap-3">
      <BrandMark organization={organization} fit={showLabels ? "wide" : "square"} />
      {showLabels &&<span className="truncate text-lg font-semibold text-gray-800 dark:text-white/90">{name}</span>}
    </Link>
  );
}

/** `brand` is the sidebar's top (see SidebarBrand); without it, the app's own. */
export function AppSidebar({ nav, brand }: { nav: ReactNode; brand?: ReactNode }) {
  const { isExpanded, isMobileOpen } = useSidebar();
  const showLabels = isExpanded || isMobileOpen;

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900",
        isExpanded ? "xl:w-[290px]" : "xl:w-[90px]",
        "w-[290px] xl:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        "print:hidden",
      )}
      data-expanded={showLabels}
      aria-label="Main navigation"
    >
      <div className={cn("flex h-[72px] shrink-0 items-center", showLabels ? "justify-start" : "justify-center")}>
        {brand ?? <SidebarBrand />}
      </div>
      <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto pb-6">{nav}</div>
    </aside>
  );
}

export function SidebarBackdrop() {
  const { isMobileOpen, closeMobile } = useSidebar();
  if (!isMobileOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-[2px] xl:hidden"
      onClick={closeMobile}
      aria-hidden
    />
  );
}

export function AdminMain({ children }: { children: ReactNode }) {
  const { isExpanded } = useSidebar();
  return (
    <div
      className={cn(
        "flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out",
        isExpanded ? "xl:ml-[290px]" : "xl:ml-[90px]",
        "print:ml-0",
      )}
    >
      {children}
    </div>
  );
}
