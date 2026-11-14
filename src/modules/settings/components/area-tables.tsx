import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime } from "@/core/utils/format";
import { deleteAreaAction, saveAreaAction } from "../actions";
import { areaTypeLabel, type Area, type DistrictOption, type ShippingZoneOption } from "../types";
import { AreaFields } from "./area-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function AreasTable({
  rows,
  districts,
  zones,
  canManage,
}: {
  rows: Area[];
  districts: DistrictOption[];
  zones: ShippingZoneOption[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Area</TH>
          <TH>District</TH>
          <TH>Type</TH>
          <TH>Shipping zone</TH>
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
              {row.nameBn && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{row.nameBn}</span>}
            </TD>
            <TD>
              <span className="text-gray-800 dark:text-gray-300">{row.districtName}</span>
              <span className={`ml-2 text-xs ${muted}`}>{row.divisionName}</span>
            </TD>
            <TD>
              <Badge>{areaTypeLabel(row.areaType)}</Badge>
            </TD>
            <TD>
              {row.shippingZoneName ? (
                <span>{row.shippingZoneName}</span>
              ) : (
                <span className={muted} title="Uses its district's zone">
                  Same as district
                </span>
              )}
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
                    title="Edit area"
                    action={saveAreaAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <AreaFields value={row} districts={districts} zones={zones} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteAreaAction.bind(null, row.id)}
                    itemLabel={`area "${row.name}" (${row.districtName})`}
                    message="Areas used by a supplier address or an order can't be deleted; deactivate them instead."
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
