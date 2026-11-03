import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Checkbox, Field, Input } from "@/core/forms/fields";
import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { deletePaymentSourceAction, savePaymentSourceAction } from "../../actions/setup";
import type { PaymentSource } from "../../types";
import { PaymentSourceLinesEditor } from "./payment-source-lines-editor";

const muted = "text-gray-500 dark:text-gray-400";

/** Fields of the add/edit payment source modal: the source, then its lines. */
export function PaymentSourceFields({ value }: { value?: PaymentSource }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="nameEn" required hint="e.g. Cash, Dutch-Bangla Bank, bKash.">
          <Input id="nameEn" name="nameEn" maxLength={150} defaultValue={value?.nameEn} required />
        </Field>
        <Field label="Name (Bangla)" name="nameLocal">
          <Input id="nameLocal" name="nameLocal" maxLength={150} defaultValue={value?.nameLocal ?? ""} />
        </Field>
      </div>
      <PaymentSourceLinesEditor initial={value?.lines ?? []} />
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be chosen on payments)" className="flex" />
    </>
  );
}

/** Each source (master) with its lines (detail): what the payment is for and the ledger head it posts to. */
export function PaymentSourcesTable({ rows, canManage }: { rows: PaymentSource[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Payment source</TH>
          <TH>Payment for → ledger head</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id} className="align-top">
            <TD className="whitespace-nowrap">
              <span className="font-medium text-gray-800 dark:text-white/90">{row.nameEn}</span>
              {row.nameLocal && <span className={`block text-xs ${muted}`}>{row.nameLocal}</span>}
            </TD>
            <TD className="min-w-80">
              {row.lines.length === 0 ? (
                <span className={`text-xs ${muted}`}>No lines</span>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {row.lines.map((line) => (
                    <li key={line.id} className="grid gap-x-4 py-1.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(8rem,1fr)_minmax(0,2fr)]">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{line.paymentFor}</span>
                      <span className="min-w-0">
                        <span className="text-gray-800 dark:text-white/90">
                          <span className="font-mono text-xs">{line.accountCode}</span> {line.accountName}
                        </span>
                        {line.accountPath && <span className={`block truncate text-xs ${muted}`}>{line.accountPath}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit payment source"
                    description={row.nameEn}
                    action={savePaymentSourceAction.bind(null, row.id)}
                    submitLabel="Save changes"
                    size="lg"
                  >
                    <PaymentSourceFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deletePaymentSourceAction.bind(null, row.id)}
                    itemLabel={`payment source "${row.nameEn}"`}
                    message="Its lines are deleted with it. A source used on documents can't be deleted; deactivate it instead."
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
