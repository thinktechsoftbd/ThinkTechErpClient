import Link from "next/link";
import { cn } from "@/core/utils/cn";

/** URL-driven tabs: each tab is a link, the active one comes from search params. */
export function LinkTabs({
  tabs,
  active,
}: {
  tabs: { key: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-gray-200 px-5 dark:border-gray-800">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          scroll={false}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition",
            tab.key === active
              ? "border-brand-500 text-brand-600 dark:text-brand-300"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
