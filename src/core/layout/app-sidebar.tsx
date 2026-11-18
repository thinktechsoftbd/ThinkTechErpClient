"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import bizoneIcon from "@/assets/brand/bizone-icon.webp";
import bizoneLogoTrimmed from "@/assets/brand/bizone-logo-trimmed.webp";
import { appConfig } from "@/core/config/app";
import { cn } from "@/core/utils/cn";
import { useSidebar } from "./sidebar-context";

/** The product the console is (fixed, unlike the organization the user works in, shown in the user menu). */
const PRODUCT_NAME = appConfig.productName;

/** The product's square icon: the collapsed sidebar and the small-screen header. */
export function BrandMark({ className }: { className?: string }) {
  return <Image src={bizoneIcon} alt={PRODUCT_NAME} loading="eager" className={cn("size-9 shrink-0", className)} />;
}

/** The sidebar's top: the product's full logo with its slogan, or only its icon while the sidebar is collapsed. */
function SidebarBrand({ expanded }: { expanded: boolean }) {
  return (
    <Link href={appConfig.homePath} aria-label={`${PRODUCT_NAME}: home`} className="flex items-center">
      {expanded ? (
        <Image
          src={bizoneLogoTrimmed}
          alt={`${PRODUCT_NAME}: ${appConfig.productSlogan}`}
          loading="eager"
          // The trimmed logo (no empty margins) spans the sidebar's width. It is transparent with dark
          // lettering: on the dark theme it sits on a white tile.
          className="h-auto w-[250px] max-w-full dark:rounded-lg dark:bg-white dark:px-2 dark:py-1"
        />
      ) : (
        <BrandMark />
      )}
    </Link>
  );
}

export function AppSidebar({ nav }: { nav: ReactNode }) {
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
        <SidebarBrand expanded={showLabels} />
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
