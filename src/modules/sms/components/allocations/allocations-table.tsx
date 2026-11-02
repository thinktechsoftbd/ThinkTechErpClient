import { Lock } from "lucide-react";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { deleteAllocationAction, saveAllocationAction } from "../../actions/allocations";
import type { SmsAllocation, SmsOrganizationBalance, SmsProvider } from "../../types";
import { AllocationFields } from "./allocation-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function AllocationsTable({
  rows,
  providers,
  organizations,
  canManage,
}: {
  rows: SmsAllocation[];
  /** For the edit modal's pickers. */
  providers: SmsProvider[];
  organizations: SmsOrganizationBalance[];
  canManage: boolean;
}) {
  // A finalized organization's allocations are locked: no Edit or Delete.
  const finalized = new Set(organizations.filter((organization) => organization.isFinalized).map((organization) => organization.objectId));
  return (
    <Table>
      <THead>
        <tr>
          <TH>Date</TH>
          <TH>Organization</TH>
          <TH>Provider</TH>
          <TH className="text-right">SMS</TH>
          <TH>Remarks</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="whitespace-nowrap">{formatDate(row.allocationDate)}</TD>
            <TD>
              <span className="font-medium text-gray-800 dark:text-white/90">{row.organizationName}</span>
              {row.organizationCode && <span className={`block text-xs ${muted}`}>{row.organizationCode}</span>}
            </TD>
            <TD>
              {row.providerName}
              <span className={`block font-mono text-xs ${muted}`}>{row.providerCode}</span>
            </TD>
            <TD className="text-right font-medium tabular-nums text-gray-800 dark:text-white/90">{formatNumber(row.allocatedSms)}</TD>
            <TD className={row.remarks ? "max-w-72" : muted}>
              {row.remarks ? (
                <span className="line-clamp-2" title={row.remarks}>
                  {row.remarks}
                </span>
              ) : (
                "—"
              )}
            </TD>
            {canManage && finalized.has(row.organizationObjectId) && (
              <TD className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 text-sm ${muted}`}
                  title={`${row.organizationName} is finalized. Clear Finalized in Security → Organizations to change its allocations.`}
                >
                  <Lock className="size-4" aria-hidden /> Locked
                </span>
              </TD>
            )}
            {canManage && !finalized.has(row.organizationObjectId) && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit allocation"
                    description={`${row.organizationName} · ${formatDate(row.allocationDate)} · ${formatNumber(row.allocatedSms)} SMS`}
                    action={saveAllocationAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <AllocationFields value={row} providers={providers} organizations={organizations} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteAllocationAction.bind(null, row.id)}
                    itemLabel={`the allocation of ${formatNumber(row.allocatedSms)} SMS to ${row.organizationName}`}
                    message="The SMS go back to the provider's stock. An allocation the organization already used can't be deleted."
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
