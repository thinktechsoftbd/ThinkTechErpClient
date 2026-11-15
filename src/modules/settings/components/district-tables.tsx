import Link from "next/link";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { deleteDistrictAction, saveDistrictAction } from "../actions";
import type { District, DistrictZoneOption, DivisionOption } from "../types";
import { DistrictFields } from "./district-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function DistrictsTable({
  rows,
  divisions,
  zones,
  canManage,
}: {
  rows: District[];
  /** For the edit modal's pickers. */
  divisions: DivisionOption[];
  zones: DistrictZoneOption[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>District</TH>
          <TH>Division</TH>
          <TH>Shipping zone</TH>
          <TH className="text-right">Areas</TH>
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
            <TD>
              <Link href={`/settings/districts?division=${row.divisionId}`} className="text-brand-500 hover:underline">
                {row.divisionName}
              </Link>
            </TD>
            <TD>{row.shippingZoneName ?? <span className={muted}>No zone</span>}</TD>
            <TD className="text-right">
              <Link
                href={`/settings/areas?district=${row.id}`}
                className="font-medium text-brand-500 hover:underline"
                title={`Show the areas of ${row.name}`}
              >
                {formatNumber(row.areaCount)}
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
                    title="Edit district"
                    action={saveDistrictAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <DistrictFields value={row} divisions={divisions} zones={zones} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteDistrictAction.bind(null, row.id)}
                    itemLabel={`district "${row.name}" (${row.divisionName})`}
                    message={
                      row.areaCount > 0
                        ? `It still has ${formatNumber(row.areaCount)} area(s), so it can't be deleted. Deactivate it instead.`
                        : "Districts used by a warehouse, a supplier address or an order can't be deleted; deactivate them instead."
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
