import Link from "next/link";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { deleteShippingZoneAction, saveShippingZoneAction } from "../actions";
import { deliveryDaysLabel, type ShippingZone } from "../types";
import { ShippingZoneFields } from "./shipping-zone-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function ShippingZonesTable({ rows, canManage }: { rows: ShippingZone[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Shipping zone</TH>
          <TH>Code</TH>
          <TH>Delivery</TH>
          <TH className="text-right">Districts</TH>
          <TH className="text-right">Areas</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const delivery = deliveryDaysLabel(row.minDeliveryDays, row.maxDeliveryDays);
          const inUse = row.districtCount + row.areaCount;
          return (
            <TR key={row.id}>
              <TD className="font-medium text-gray-800 dark:text-white/90">{row.name}</TD>
              <TD className={`font-mono text-xs ${muted}`}>{row.code}</TD>
              <TD className="whitespace-nowrap">{delivery ?? <span className={muted}>Not set</span>}</TD>
              <TD className="text-right">
                <Link
                  href={`/settings/districts?zone=${row.id}`}
                  className="font-medium text-brand-500 hover:underline"
                  title={`Show the districts in ${row.name}`}
                >
                  {formatNumber(row.districtCount)}
                </Link>
              </TD>
              <TD className="text-right" title="Areas that override their district's zone with this one">
                {formatNumber(row.areaCount)}
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
                      label="Edit shipping zone"
                      title="Edit shipping zone"
                      action={saveShippingZoneAction.bind(null, row.id)}
                      submitLabel="Save changes"
                    >
                      <ShippingZoneFields value={row} />
                    </FormModalButton>
                    <ConfirmDeleteButton
                      iconOnly
                      action={deleteShippingZoneAction.bind(null, row.id)}
                      itemLabel={`shipping zone "${row.name}"`}
                      message={
                        inUse > 0
                          ? `${formatNumber(row.districtCount)} district(s) and ${formatNumber(row.areaCount)} area(s) use it, so it can't be deleted. Deactivate it instead.`
                          : "Zones used by shipping rates or orders can't be deleted; deactivate them instead."
                      }
                    />
                  </span>
                </TD>
              )}
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
