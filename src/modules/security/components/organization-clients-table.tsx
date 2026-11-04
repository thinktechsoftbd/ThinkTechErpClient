import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { OrganizationClientFields } from "./organization-client-fields";
import { OrganizationClientActiveToggle } from "./organization-client-active-toggle";
import { saveOrganizationClientAction } from "../actions";
import type { OrganizationClient } from "../types";

export function OrganizationClientsTable({
  clients,
  canManage,
}: {
  clients: OrganizationClient[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Client</TH>
          <TH>Organization</TH>
          <TH>Acting user</TH>
          <TH>Scopes</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {clients.map((client) => (
          <TR key={client.id}>
            <TD>
              <span className="font-medium text-gray-800 dark:text-white/90">{client.clientName}</span>
              <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400" title={client.objectId}>
                {client.objectId}
              </p>
            </TD>
            <TD>
              {client.organizationName ? (
                <span title={client.orgObjectId ?? undefined}>{client.organizationName}</span>
              ) : <span className="text-gray-500">—</span>}
            </TD>
            <TD>
              <span>{client.actingUserName}</span>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">ID {client.actingUserId}</p>
            </TD>
            <TD>
              <div className="flex max-w-xl flex-wrap gap-1.5">
                {client.scopes.map((scope) => (
                  <Badge key={scope} tone="brand">{scope}</Badge>
                ))}
              </div>
            </TD>
            <TD>
              {canManage ? <OrganizationClientActiveToggle client={client} /> : <StatusBadge active={client.isActive} />}
            </TD>
            {canManage && (
              <TD className="text-right">
                <FormModalButton
                  mode="edit"
                  label="Edit"
                  title="Edit API client"
                  description={client.clientName}
                  action={saveOrganizationClientAction.bind(null, client.id)}
                  submitLabel="Save client"
                  size="lg"
                >
                  <OrganizationClientFields client={client} />
                </FormModalButton>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
