import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/core/utils/cn";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("custom-scrollbar max-w-full overflow-x-auto", className)}>
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-y border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>;
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase dark:text-gray-400",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return (
    <td className={cn("px-5 py-3.5 text-gray-700 dark:text-gray-300", className)} {...props} />
  );
}

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("hover:bg-gray-50/70 dark:hover:bg-white/[0.02]", className)} {...props} />;
}
