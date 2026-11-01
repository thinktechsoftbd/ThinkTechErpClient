import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Checkbox, Field, Input } from "@/core/forms/fields";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatQuantity } from "@/core/utils/number";
import { deleteTaxGroupAction, saveTaxGroupAction } from "../../actions/setup";
import type { TaxGroup, TaxRate } from "../../types";
import { TaxGroupRatesEditor, type TaxRateChoice } from "./tax-group-rates-editor";

/** The rates the editor offers, plus any of the group's own rates missing from the list. */
function rateCatalog(taxRates: TaxRate[], group?: TaxGroup): TaxRateChoice[] {
  const catalog: TaxRateChoice[] = taxRates.map((rate) => ({
    id: rate.id,
    code: rate.code,
    name: rate.name,
    taxType: rate.taxType,
    ratePercent: rate.ratePercent,
    isRecoverable: rate.isRecoverable,
    isActive: rate.isActive,
  }));
  for (const item of group?.rates ?? []) {
    if (catalog.some((rate) => rate.id === item.taxRateId)) continue;
    catalog.push({
      id: item.taxRateId,
      code: item.taxCode,
      name: item.taxName,
      taxType: item.taxType,
      ratePercent: item.ratePercent,
      isRecoverable: item.isRecoverable,
      isActive: false,
    });
  }
  return catalog.sort((a, b) => a.code.localeCompare(b.code));
}

function orderedRates(group: TaxGroup) {
  return [...group.rates].sort((a, b) => a.sequenceNo - b.sequenceNo);
}

/** Fields of the add/edit tax group modal. */
export function TaxGroupFields({ value, taxRates }: { value?: TaxGroup; taxRates: TaxRate[] }) {
  const initial = value ? orderedRates(value).map((rate) => ({ taxRateId: rate.taxRateId, isCompound: rate.isCompound })) : [];
  return (
    <>
      <Field label="Name" name="name" required hint="As chosen on products and lines, e.g. VAT 15% or SD 20% + VAT 15%.">
        <Input id="name" name="name" maxLength={150} defaultValue={value?.name} required />
      </Field>
      <TaxGroupRatesEditor catalog={rateCatalog(taxRates, value)} initial={initial} />
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be chosen on products and lines)" className="flex" />
    </>
  );
}

/** The group's rates as chips, in order; compound ones are marked. */
function RateChips({ group }: { group: TaxGroup }) {
  if (group.rates.length === 0) return <Badge>Exempt</Badge>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {orderedRates(group).map((rate) => (
        <Badge key={rate.taxRateId} tone={rate.isRecoverable ? "brand" : "warning"}>
          <span title={`${rate.taxName}${rate.isCompound ? ", compound (on the amount plus the taxes before it)" : ""}${rate.isRecoverable ? "" : ", adds to cost"}`}>
            {rate.isCompound && <span aria-hidden>+ </span>}
            {rate.taxCode} {formatQuantity(rate.ratePercent)}%{rate.isCompound && <span className="sr-only"> (compound)</span>}
          </span>
        </Badge>
      ))}
    </span>
  );
}

export function TaxGroupsTable({ rows, taxRates, canManage }: { rows: TaxGroup[]; taxRates: TaxRate[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Name</TH>
          <TH>Rates</TH>
          <TH className="text-right">Effective rate</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="font-medium text-gray-800 dark:text-white/90">{row.name}</TD>
            <TD>
              <RateChips group={row} />
            </TD>
            <TD className="text-right font-medium whitespace-nowrap tabular-nums">{formatQuantity(row.effectiveRatePercent)}%</TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit tax group"
                    description={row.name}
                    action={saveTaxGroupAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <TaxGroupFields value={row} taxRates={taxRates} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteTaxGroupAction.bind(null, row.id)}
                    itemLabel={`tax group "${row.name}"`}
                    message="A group used on products or documents can't be deleted; deactivate it instead."
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
