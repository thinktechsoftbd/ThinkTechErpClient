import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatNumber } from "@/core/utils/format";
import { deleteProviderAction, saveProviderAction } from "../../actions/providers";
import { providerLabel, type SmsProvider } from "../../types";
import { ProviderFields } from "./provider-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function ProvidersTable({ rows, canManage }: { rows: SmsProvider[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Provider</TH>
          <TH>API</TH>
          <TH>Credentials</TH>
          <TH className="text-right">Bought</TH>
          <TH className="text-right">Allocated</TH>
          <TH className="text-right">Left to allocate</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span>
              <span className={`block font-mono text-xs ${muted}`}>{row.code}</span>
            </TD>
            <TD className="max-w-72">
              {row.apiBaseUrl ? <span className="block truncate" title={row.apiBaseUrl}>{row.apiBaseUrl}</span> : <span className={muted}>—</span>}
              {row.apiUsername && <span className={`block text-xs ${muted}`}>User: {row.apiUsername}</span>}
            </TD>
            <TD>
              {row.hasApiPassword || row.hasApiKey ? (
                <span className="inline-flex flex-wrap gap-1">
                  {row.hasApiPassword && <Badge tone="brand">Password set</Badge>}
                  {row.hasApiKey && <Badge tone="brand">Key set</Badge>}
                </span>
              ) : (
                <span className={muted}>None</span>
              )}
            </TD>
            <TD className="text-right tabular-nums">{formatNumber(row.purchasedSms)}</TD>
            <TD className="text-right tabular-nums">{formatNumber(row.allocatedSms)}</TD>
            <TD className="text-right font-medium tabular-nums text-gray-800 dark:text-white/90">{formatNumber(row.availableSms)}</TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit provider"
                    description={providerLabel(row)}
                    action={saveProviderAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <ProviderFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteProviderAction.bind(null, row.id)}
                    itemLabel={`provider "${row.name}"`}
                    message="A provider SMS were bought from or allocated with can't be deleted; deactivate it instead."
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
