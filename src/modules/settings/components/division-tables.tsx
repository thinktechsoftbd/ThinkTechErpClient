import Link from "next/link";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { deleteDivisionAction, saveDivisionAction } from "../actions";
import type { Division } from "../types";
import { DivisionFields } from "./division-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function DivisionsTable({ rows, canManage }: { rows: Division[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Division</TH>
          <TH className="text-right">Districts</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span>
              {row.nameBn && <span className={`ml-2 text-xs ${muted}`}>{row.nameBn}</span>}
            </TD>
            <TD className="text-right">
              <Link
                href={`/settings/districts?division=${row.id}`}
                className="font-medium text-brand-500 hover:underline"
                title={`Show the districts of ${row.name}`}
              >
                {formatNumber(row.districtCount)}
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
                    iconOnly
                    label="Edit division"
                    title="Edit division"
                    action={saveDivisionAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <DivisionFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    iconOnly
                    action={deleteDivisionAction.bind(null, row.id)}
                    itemLabel={`division "${row.name}"`}
                    message={
                      row.districtCount > 0
                        ? `It still has ${formatNumber(row.districtCount)} district(s); only a division without districts can be deleted. Deactivate it instead.`
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
