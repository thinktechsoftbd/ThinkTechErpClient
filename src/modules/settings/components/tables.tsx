import Link from "next/link";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import {
  deleteLookupDataAction,
  deleteLookupTableAction,
  saveLookupDataAction,
  saveLookupTableAction,
} from "../actions";
import type { LookupData, LookupTable } from "../types";
import { LookupDataFields, LookupTableFields } from "./lookup-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function LookupTablesTable({ rows, canManage }: { rows: LookupTable[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Name</TH>
          <TH className="text-right">Values</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="font-medium text-gray-800 dark:text-white/90">{row.name}</TD>
            <TD className="text-right">
              <Link
                href={`/settings/lookup-data?table=${row.id}`}
                className="font-medium text-brand-500 hover:underline"
                title={`Show the values of ${row.name}`}
              >
                {formatNumber(row.dataCount)}
              </Link>
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(row.updatedAt ?? row.createdAt)}</TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit lookup table"
                    action={saveLookupTableAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <LookupTableFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteLookupTableAction.bind(null, row.id)}
                    itemLabel={`lookup table "${row.name}"`}
                    message={
                      row.dataCount > 0
                        ? `It still has ${formatNumber(row.dataCount)} value(s); the API only deletes empty tables. Deactivate it instead to hide it.`
                        : undefined
                    }
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

export function LookupDataTable({
  rows,
  tables,
  canManage,
}: {
  rows: LookupData[];
  /** For the edit modal's table picker. */
  tables: Pick<LookupTable, "id" | "name" | "isActive">[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Value</TH>
          <TH>Lookup table</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="font-medium text-gray-800 dark:text-white/90">{row.name}</TD>
            <TD>
              <Link href={`/settings/lookup-data?table=${row.lookupTableId}`} className="text-brand-500 hover:underline">
                {row.lookupTableName}
              </Link>
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(row.updatedAt ?? row.createdAt)}</TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit lookup value"
                    action={saveLookupDataAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <LookupDataFields value={row} tables={tables} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteLookupDataAction.bind(null, row.id)}
                    itemLabel={`"${row.name}" from ${row.lookupTableName}`}
                    message="Values already used elsewhere (e.g. as a subscription's currency) can't be deleted; deactivate them instead."
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
