"use client";

import { useState } from "react";
import { ActionForm, FieldError, FormMessage } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Alert } from "@/core/ui/alert";
import { cn } from "@/core/utils/cn";
import { ORGANIZATION_MANAGE_PERMISSION } from "../types";
import { FormActions } from "./form-parts";

export type OrganizationChoice = { id: number; name: string; code: string | null; isActive: boolean };

const muted = "text-gray-500 dark:text-gray-400";

/**
 * The organizations a user works in: a checkbox per organization plus a radio for the default
 * (the one the API uses when the header's switcher hasn't chosen another).
 */
export function UserOrganizationsForm({
  action,
  organizations,
  linkedIds,
  defaultId,
  hasAllOrganizations,
  readOnly,
}: {
  action: FormAction;
  /** Every organization to choose from, in display order. */
  organizations: OrganizationChoice[];
  linkedIds: number[];
  defaultId: number | null;
  /** The user holds ORGANIZATION.M (Super Admin) and can use every organization anyway. */
  hasAllOrganizations: boolean;
  readOnly?: boolean;
}) {
  const [selected, setSelected] = useState(() => new Set(linkedIds));
  const [chosenDefault, setChosenDefault] = useState(defaultId);

  // The default must be a ticked organization; otherwise the first ticked one takes its place.
  const effectiveDefault =
    chosenDefault !== null && selected.has(chosenDefault)
      ? chosenDefault
      : (organizations.find((organization) => selected.has(organization.id))?.id ?? null);

  const toggle = (id: number, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <ActionForm action={action}>
      <fieldset disabled={readOnly} className="space-y-4">
        <FormMessage />
        {hasAllOrganizations && (
          <Alert tone="info">
            This user holds <code className="font-mono text-xs">{ORGANIZATION_MANAGE_PERMISSION}</code> (Super Admin) and can work in
            every active organization. Links here set which one opens by default.
          </Alert>
        )}
        {!hasAllOrganizations && selected.size === 0 && organizations.length > 0 && (
          <Alert tone="warning">Without an organization this user can&apos;t open Inventory or Purchase data.</Alert>
        )}

        {organizations.length === 0 ? (
          <p className={`text-sm ${muted}`}>No organizations yet. Create them under Security → Organizations.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {organizations.map((organization) => {
              const linked = selected.has(organization.id);
              return (
                <li key={organization.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <label className="flex min-w-0 cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="organizationIds"
                      value={organization.id}
                      checked={linked}
                      onChange={(event) => toggle(organization.id, event.target.checked)}
                      className="size-4 shrink-0 rounded border-gray-300 accent-brand-500 dark:border-gray-700"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-800 dark:text-white/90">{organization.name}</span>
                      {(organization.code || !organization.isActive) && (
                        <span className={`block text-xs ${muted}`}>
                          {[organization.code, organization.isActive ? null : "inactive"].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </label>
                  <label
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 text-xs",
                      linked ? "cursor-pointer text-gray-700 dark:text-gray-300" : "cursor-not-allowed text-gray-400 dark:text-gray-600",
                    )}
                  >
                    <input
                      type="radio"
                      name="defaultOrganizationId"
                      value={organization.id}
                      checked={effectiveDefault === organization.id}
                      disabled={!linked}
                      onChange={() => setChosenDefault(organization.id)}
                      className="size-4 accent-brand-500 disabled:opacity-40"
                    />
                    Default
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <FieldError name="organizationIds" />
        <FieldError name="defaultOrganizationId" />
        <FormActions readOnly={readOnly} submitLabel="Save organizations" />
      </fieldset>
    </ActionForm>
  );
}
