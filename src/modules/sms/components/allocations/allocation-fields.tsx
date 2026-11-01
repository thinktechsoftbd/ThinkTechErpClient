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

type OrganizationOption = { objectId: string; label: string; balance?: SmsOrganizationBalance };

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
      label: `${organizationLabel(organization)}${organization.isActive ? "" : " (inactive)"}`,
      balance: organization,
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
 * Fields of the allocate/edit allocation modal: an active provider (with what it has left to
 * allocate) and an organization (with what it has left), the SMS count, date and remarks.
 */
export function AllocationFields({
  value,
  providers,
  organizations,
  organizationObjectId,
}: {
  value?: SmsAllocation;
  /** Every provider; inactive ones are offered only when the allocation already uses them. */
  providers: SmsProvider[];
  /** Every organization; inactive ones are offered only when already chosen. */
  organizations: SmsOrganizationBalance[];
  /** Organization chosen up front for a new allocation (e.g. from ?organizationId=). */
  organizationObjectId?: string;
}) {
  const providerOptions = providers.filter((provider) => provider.isActive || provider.id === value?.providerId);
  const orgOptions = organizationOptions(organizations, value, organizationObjectId);

  const [providerId, setProviderId] = useState(
    String(value?.providerId ?? (providerOptions.length === 1 ? providerOptions[0].id : "")),
  );
  const [organizationId, setOrganizationId] = useState(value?.organizationObjectId ?? organizationObjectId ?? "");

  // This allocation's own SMS go back to its provider's stock when it is changed.
  const leftToAllocate = (provider: SmsProvider) =>
    provider.availableSms + (value && provider.id === value.providerId ? value.allocatedSms : 0);
  const provider = providerOptions.find((option) => String(option.id) === providerId);
  const organization = orgOptions.find((option) => option.objectId === organizationId)?.balance;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Provider"
        name="providerId"
        required
        className={wide}
        hint={provider ? `${formatQuantity(leftToAllocate(provider))} SMS left to allocate.` : "Allocated from this provider's stock."}
      >
        <Select id="providerId" name="providerId" value={providerId} onChange={(event) => setProviderId(event.target.value)} required>
          <option value="" disabled>
            Choose a provider
          </option>
          {providerOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {`${providerLabel(option)} · ${formatQuantity(leftToAllocate(option))} left to allocate${option.isActive ? "" : " (inactive)"}`}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Organization"
        name="organizationObjectId"
        required
        className={wide}
        hint={
          organization
            ? `Has ${formatQuantity(organization.availableSms)} SMS left (${formatQuantity(organization.allocatedSms)} allocated, ${formatQuantity(organization.smsUsage)} used).`
            : undefined
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
            <option key={option.objectId} value={option.objectId}>
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
