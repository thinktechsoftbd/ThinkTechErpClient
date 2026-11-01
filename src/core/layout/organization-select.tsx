"use client";

import { Building2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { switchOrganizationAction } from "@/core/org/actions";

export function OrganizationSelect({ currentId, options }: { currentId: number; options: { id: number; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  return (
    <form ref={formRef} action={switchOrganizationAction} className="hidden items-center gap-2 sm:flex">
      <Building2 className="size-4 text-gray-500 dark:text-gray-400" aria-hidden />
      <input type="hidden" name="returnTo" value={pathname} />
      <select
        name="organizationId"
        defaultValue={currentId}
        aria-label="Organization"
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 max-w-56 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </form>
  );
}
