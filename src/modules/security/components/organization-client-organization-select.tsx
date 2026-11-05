"use client";

import { useState } from "react";
import { Field } from "@/core/forms/fields";
import { SearchSelect } from "@/core/forms/search-select";
import { searchOrganizationClientOrganizationsAction } from "../actions";
import type { OrganizationClientOrganizationOption } from "../types";

function label(option: OrganizationClientOrganizationOption) {
  return `${option.nameEn}${option.code ? ` (${option.code})` : ""}${option.isActive ? "" : " — inactive"}`;
}

/** Organizations from the server, 50 at a time, searched by name, code or UUID. */
async function loadOrganizations(search: string, offset: number) {
  const result = await searchOrganizationClientOrganizationsAction(search, offset);
  if (!result.ok) throw new Error(result.error.message);
  return { items: result.data.items, totalCount: result.data.totalCount };
}

/** The client's organization: a dropdown with a search box at the top of its list. Posts "orgObjectId". */
export function OrganizationClientOrganizationSelect({
  initialId,
  initialName,
}: {
  initialId: string | null;
  initialName: string | null;
}) {
  const [selected, setSelected] = useState<OrganizationClientOrganizationOption | null>(
    initialId ? { objectId: initialId, nameEn: initialName ?? initialId, code: null, isActive: true } : null,
  );

  return (
    <Field label="Organization" name="orgObjectId" required hint="Search by organization name, code, or UUID.">
      <SearchSelect
        id="orgObjectId"
        name="orgObjectId"
        value={selected}
        onChange={setSelected}
        load={loadOrganizations}
        optionKey={(option) => option.objectId}
        optionLabel={label}
        renderOption={(option) => (
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate">{option.nameEn}</span>
            <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
              {option.code}
              {!option.isActive && " · inactive"}
            </span>
          </span>
        )}
        placeholder="Choose an organization"
        searchPlaceholder="Search organizations…"
        emptyText="No matching organizations."
      />
    </Field>
  );
}
