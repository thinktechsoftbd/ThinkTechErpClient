import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatQuantity } from "@/core/utils/number";
import { deleteTaxRateAction, saveTaxRateAction } from "../../actions/setup";
import { TAX_TYPES, purchaseLabel, type TaxRate } from "../../types";

const muted = "text-gray-500 dark:text-gray-400";

export function formatPercent(value: number) {
  return `${formatQuantity(value)}%`;
}

export const TAX_TYPE_OPTIONS = TAX_TYPES.map((type) => ({ value: type, label: purchaseLabel(type) }));

/** Fields of the add/edit tax rate modal. */
export function TaxRateFields({ value }: { value?: TaxRate }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code" name="code" required hint="Short and unique, e.g. VAT15 or SD20.">
          <Input id="code" name="code" maxLength={30} defaultValue={value?.code} required autoComplete="off" />
        </Field>
        <Field label="Name" name="name" required hint="As shown on documents, e.g. VAT 15%.">
          <Input id="name" name="name" maxLength={150} defaultValue={value?.name} required />
        </Field>
        <Field label="Tax type" name="taxType" required>
          <Select id="taxType" name="taxType" defaultValue={value?.taxType ?? "VAT"} required>
            {TAX_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rate (%)" name="ratePercent" required hint="E.g. 15 for 15%.">
          <Input
            id="ratePercent"
            name="ratePercent"
            inputMode="decimal"
            defaultValue={value ? String(value.ratePercent) : ""}
            placeholder="15"
            required
          />
        </Field>
      </div>
      <div className="space-y-3">
        <Checkbox
          name="isRecoverable"
          defaultChecked={value?.isRecoverable ?? true}
          className="flex items-start"
          label={
            <span>
              Recoverable
              <span className={`block text-xs ${muted}`}>
                Input tax you can claim back (e.g. VAT with a valid challan). A non-recoverable tax adds to the cost of the goods.
              </span>
            </span>
          }
        />
        <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be added to tax groups)" className="flex" />
      </div>
    </>
  );
}

export function TaxRatesTable({ rows, canManage }: { rows: TaxRate[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Code</TH>
          <TH>Name</TH>
          <TH>Type</TH>
          <TH className="text-right">Rate</TH>
          <TH>Recoverable</TH>
          <TH className="text-right">Groups</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="font-mono text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">{row.code}</TD>
            <TD className="font-medium text-gray-800 dark:text-white/90">{row.name}</TD>
            <TD>{purchaseLabel(row.taxType)}</TD>
            <TD className="text-right font-medium whitespace-nowrap tabular-nums">{formatPercent(row.ratePercent)}</TD>
            <TD>
              {row.isRecoverable ? <Badge tone="success">Recoverable</Badge> : <Badge tone="warning">Adds to cost</Badge>}
            </TD>
            <TD className="text-right tabular-nums">{formatQuantity(row.groupCount)}</TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit tax rate"
                    description={row.code}
                    action={saveTaxRateAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <TaxRateFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteTaxRateAction.bind(null, row.id)}
                    itemLabel={`tax rate "${row.code}"`}
                    message={
                      row.groupCount > 0
                        ? `It is in ${formatQuantity(row.groupCount)} tax group(s); remove it from them first, or deactivate it instead.`
                        : "A rate already used on documents can't be deleted; deactivate it instead."
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
