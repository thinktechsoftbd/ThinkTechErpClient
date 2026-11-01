import Link from "next/link";
import { ListFilter, MessageSquarePlus } from "lucide-react";
import { FormModalButton, rowActionClass } from "@/core/crud/form-modal-button";
import { Field, Input } from "@/core/forms/fields";
import { Badge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { correctUsageAction, recordUsageAction } from "../../actions/usage";
import { organizationLabel, type SmsOrganizationBalance } from "../../types";
import { SmsLeft } from "../sms-left";

const muted = "text-gray-500 dark:text-gray-400";

/** The most SMS one usage record may add (the API's limit). */
const MAX_USAGE_PER_RECORD = 10_000_000;

/** The organization's allocations, filtered. */
function organizationAllocationsHref(objectId: string) {
  return `/sms/allocations?organizationId=${objectId}`;
}

/** The allocations list with the allocate form open for the organization. */
function allocateToHref(objectId: string) {
  return `${organizationAllocationsHref(objectId)}&new=1`;
}

function balanceSummary(row: SmsOrganizationBalance) {
  return `${organizationLabel(row)} · ${formatNumber(row.availableSms)} of ${formatNumber(row.allocatedSms)} left`;
}

function RecordUsageButton({ row }: { row: SmsOrganizationBalance }) {
  return (
    <FormModalButton
      mode="edit"
      label="Record usage"
      title="Record usage"
      description={balanceSummary(row)}
      action={recordUsageAction.bind(null, row.objectId)}
      submitLabel="Record"
      size="sm"
    >
      <Field label="SMS sent" name="smsCount" required hint="Added to what the organization used so far.">
        <Input
          id="smsCount"
          name="smsCount"
          type="number"
          min={1}
          max={Math.min(row.availableSms, MAX_USAGE_PER_RECORD)}
          step={1}
          required
        />
      </Field>
    </FormModalButton>
  );
}

function CorrectUsageButton({ row }: { row: SmsOrganizationBalance }) {
  return (
    <FormModalButton
      mode="edit"
      label="Correct usage"
      title="Correct usage"
      description={balanceSummary(row)}
      action={correctUsageAction.bind(null, row.objectId)}
      submitLabel="Save"
      size="sm"
    >
      <Field
        label="Total used"
        name="smsUsage"
        required
        hint={`All SMS the organization has used, from 0 to the ${formatNumber(row.allocatedSms)} allocated (e.g. after the provider's report).`}
      >
        <Input
          id="smsUsage"
          name="smsUsage"
          type="number"
          min={0}
          max={row.allocatedSms}
          step={1}
          defaultValue={String(row.smsUsage)}
          required
        />
      </Field>
    </FormModalButton>
  );
}

export function OrganizationsTable({ rows, canManage }: { rows: SmsOrganizationBalance[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Organization</TH>
          <TH className="text-right">Allocated</TH>
          <TH className="text-right">Used</TH>
          <TH className="text-right">Left</TH>
          <TH className="text-right">Allocations</TH>
          <TH>Last allocation</TH>
          <TH className="text-right">Actions</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.objectId}>
            <TD>
              <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span>
              {!row.isActive && (
                <span className="ml-2">
                  <Badge>Inactive</Badge>
                </span>
              )}
              {row.code && <span className={`block text-xs ${muted}`}>{row.code}</span>}
            </TD>
            <TD className="text-right tabular-nums">{formatNumber(row.allocatedSms)}</TD>
            <TD className="text-right tabular-nums">{formatNumber(row.smsUsage)}</TD>
            <TD className="text-right whitespace-nowrap">
              <SmsLeft left={row.availableSms} allocated={row.allocatedSms} />
            </TD>
            <TD className="text-right tabular-nums">{formatNumber(row.allocationCount)}</TD>
            <TD className={row.lastAllocationDate ? "whitespace-nowrap" : muted}>{formatDate(row.lastAllocationDate)}</TD>
            <TD className="text-right">
              <span className="inline-flex items-center gap-1">
                {canManage && row.isActive && (
                  <Link href={allocateToHref(row.objectId)} className={rowActionClass} title={`Allocate SMS to ${row.name}`}>
                    <MessageSquarePlus className="size-4" aria-hidden /> Allocate
                  </Link>
                )}
                {/* The API refuses usage beyond what is left, so recording needs SMS left. */}
                {canManage && row.availableSms > 0 && <RecordUsageButton row={row} />}
                {canManage && row.allocatedSms > 0 && <CorrectUsageButton row={row} />}
                {row.allocationCount > 0 && (
                  <Link href={organizationAllocationsHref(row.objectId)} className={rowActionClass}>
                    <ListFilter className="size-4" aria-hidden /> Allocations
                  </Link>
                )}
              </span>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
