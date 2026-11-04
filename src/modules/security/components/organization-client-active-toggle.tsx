"use client";

import { useState, useTransition } from "react";
import { setOrganizationClientActiveAction } from "../actions";
import type { OrganizationClient } from "../types";
import { StatusBadge } from "@/core/ui/badge";

export function OrganizationClientActiveToggle({ client }: { client: Pick<OrganizationClient, "id" | "isActive"> }) {
  const [active, setActive] = useState(client.isActive);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        aria-label={`${active ? "Deactivate" : "Activate"} client`}
        onClick={() => {
          const nextActive = !active;
          setError(undefined);
          startTransition(async () => {
            const result = await setOrganizationClientActiveAction(client.id, nextActive);
            if (result.status === "success") setActive(nextActive);
            else setError(result.message ?? "Could not update client status.");
          });
        }}
        className="rounded focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? <span className="text-xs text-gray-500">Saving…</span> : <StatusBadge active={active} />}
      </button>
      {error && <span className="max-w-52 text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
