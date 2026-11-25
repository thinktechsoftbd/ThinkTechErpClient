"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/core/forms/fields";
import { formatQuantity, todayIso } from "@/core/utils/number";
import {
  organizationLabel,
  providerLabel,
  type SmsAllocation,
  type SmsOrganizationBalance,
  type SmsProvider,
} from "../../types";

const wide = "sm:col-span-2";

type OrganizationOption = { objectId: string; label: string; balance?: SmsOrganizationBalance; locked?: boolean };

function organizationOptions(
  organizations: SmsOrganizationBalance[],
  value: SmsAllocation | undefined,
  preselected: string | undefined,
): OrganizationOption[] {
  const keep = new Set([value?.organizationObjectId, preselected]);
  const options: OrganizationOption[] = organizations
    .filter((organization) => organization.isActive || keep.has(organization.objectId))
    .map((organization) => ({
      objectId: organization.objectId,
      label: `${organizationLabel(organization)}${organization.providerName ? ` · ${organization.providerName}` : " (no SMS provider)"}${organization.isActive ? "" : " (inactive)"}${organization.isFinalized ? " (finalized)" : ""}`,
      balance: organization,
      // Finalized organizations' allocations are locked, and one without a provider has no stock to be
      // allocated from: shown, but they can't be chosen.
      locked: organization.isFinalized || organization.providerId === null,
    }));
  // Beyond the picker's first 500 organizations: still show the one being edited.
  if (value && !options.some((option) => option.objectId === value.organizationObjectId)) {
    options.push({
      objectId: value.organizationObjectId,
      label: organizationLabel({ name: value.organizationName, code: value.organizationCode }),
    });
  }
  return options;
}

/**
 * Fields of the allocate/edit allocation modal: an organization (with what it has left, and what its
 * provider has left to allocate), the SMS count, date and remarks. The SMS come from the stock of the
 * organization's provider, chosen in Security → Organizations.
 */
export function AllocationFields({
  value,
  providers,
  organizations,
  organizationObjectId,
}: {
  value?: SmsAllocation;
  /** Every provider, for what the chosen organization's provider has left to allocate. */
  providers: SmsProvider[];
  /** Every organization; inactive ones are offered only when already chosen. */
  organizations: SmsOrganizationBalance[];
  /** Organization chosen up front for a new allocation (e.g. from ?organizationId=). */
  organizationObjectId?: string;
}) {
  const orgOptions = organizationOptions(organizations, value, organizationObjectId);

  // A finalized organization, or one without a provider, from ?organizationId= isn't preselected: it can't be allocated to.
  const [organizationId, setOrganizationId] = useState(
    value?.organizationObjectId ??
      (orgOptions.some((option) => option.objectId === organizationObjectId && !option.locked) ? organizationObjectId : undefined) ??
      "",
  );

  const organization = orgOptions.find((option) => option.objectId === organizationId)?.balance;
  const provider = providers.find((option) => option.id === organization?.providerId);
  // This allocation's own SMS go back to its provider's stock when it is changed.
  const ownProviderId = value && organizations.find((option) => option.objectId === value.organizationObjectId)?.providerId;
  const leftToAllocate = provider ? provider.availableSms + (value && provider.id === ownProviderId ? value.allocatedSms : 0) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Organization"
        name="organizationObjectId"
        required
        className={wide}
        hint={
          organization ? (
            <>
              {`Has ${formatQuantity(organization.availableSms)} SMS left (${formatQuantity(organization.allocatedSms)} allocated, ${formatQuantity(organization.smsUsage)} used).`}
              {provider && (
                <span className="block">
                  {`Allocated from ${providerLabel(provider)}${provider.isActive ? "" : " (inactive)"}, which has ${formatQuantity(leftToAllocate)} left to allocate.`}
                </span>
              )}
            </>
          ) : (
            "SMS come from the stock of the organization's provider, chosen in Security → Organizations."
          )
        }
      >
        <Select
          id="organizationObjectId"
          name="organizationObjectId"
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          required
        >
          <option value="" disabled>
            Choose an organization
          </option>
          {orgOptions.map((option) => (
            <option key={option.objectId} value={option.objectId} disabled={option.locked}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="SMS" name="allocatedSms" required hint="How many SMS to allocate.">
        <Input
          id="allocatedSms"
          name="allocatedSms"
          type="number"
          min={1}
          step={1}
          defaultValue={value ? String(value.allocatedSms) : ""}
          required
        />
      </Field>
      <Field label="Allocation date" name="allocationDate" required>
        <Input id="allocationDate" name="allocationDate" type="date" defaultValue={value?.allocationDate ?? todayIso()} required />
      </Field>
      <Field label="Remarks" name="remarks" className={wide}>
        <Textarea id="remarks" name="remarks" rows={2} maxLength={2000} defaultValue={value?.remarks ?? ""} />
      </Field>
    </div>
  );
}
