import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity, round } from "@/core/utils/number";
import type { LookupOption } from "@/modules/settings/types";
import { deletePurchaseAction, savePurchaseAction } from "../../actions/purchases";
import { LOCAL_CURRENCY, isLocalCurrency, type SmsProvider, type SmsPurchase } from "../../types";
import { PurchaseFields } from "./purchase-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function PurchasesTable({
  rows,
  allShown,
  providers,
  currencies,
  canManage,
}: {
  rows: SmsPurchase[];
  /** Whether the rows are every purchase matching the filters (labels the totals row). */
  allShown: boolean;
  /** For the edit modal's pickers. */
  providers: SmsProvider[];
  currencies: LookupOption[];
  canManage: boolean;
}) {
  const totalSms = rows.reduce((sum, row) => sum + row.smsQuantity, 0);
  const totalLocal = round(rows.reduce((sum, row) => sum + row.localTotalAmount, 0), 2);

  return (
    <Table>
      <THead>
        <tr>
          <TH>Date</TH>
          <TH>Provider</TH>
          <TH>Invoice / reference</TH>
          <TH className="text-right">SMS</TH>
          <TH className="text-right">Unit price</TH>
          <TH className="text-right">Total</TH>
          <TH className="text-right">Total ({LOCAL_CURRENCY})</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const local = isLocalCurrency(row.currency);
          return (
            <TR key={row.id}>
              <TD className="whitespace-nowrap">{formatDate(row.purchaseDate)}</TD>
              <TD>
                <span className="font-medium text-gray-800 dark:text-white/90">{row.providerName}</span>
                <span className={`block font-mono text-xs ${muted}`}>{row.providerCode}</span>
              </TD>
              <TD>
                {row.invoiceNumber && <span className="block">{row.invoiceNumber}</span>}
                {row.referenceNumber && <span className={`block text-xs ${muted}`}>Ref: {row.referenceNumber}</span>}
                {!row.invoiceNumber && !row.referenceNumber && <span className={muted}>—</span>}
                {row.remarks && (
                  <span className={`block max-w-64 truncate text-xs ${muted}`} title={row.remarks}>
                    {row.remarks}
                  </span>
                )}
              </TD>
              <TD className="text-right font-medium tabular-nums text-gray-800 dark:text-white/90">{formatNumber(row.smsQuantity)}</TD>
              <TD className="text-right whitespace-nowrap tabular-nums">
                {formatQuantity(row.unitPrice)} <span className={`text-xs ${muted}`}>{row.currency}</span>
              </TD>
              <TD className="text-right whitespace-nowrap tabular-nums">
                {formatAmount(row.totalAmount)} <span className={`text-xs ${muted}`}>{row.currency}</span>
              </TD>
              <TD className="text-right whitespace-nowrap tabular-nums">
                {formatAmount(row.localTotalAmount)}
                {!local && <span className={`block text-xs ${muted}`}>at {formatQuantity(row.localExchangeRate)}</span>}
              </TD>
              {canManage && (
                <TD className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <FormModalButton
                      mode="edit"
                      label="Edit"
                      title="Edit purchase"
                      description={`${row.providerName} · ${formatDate(row.purchaseDate)} · ${formatNumber(row.smsQuantity)} SMS`}
                      action={savePurchaseAction.bind(null, row.id)}
                      submitLabel="Save changes"
                      size="lg"
                    >
                      <PurchaseFields value={row} providers={providers} currencies={currencies} />
                    </FormModalButton>
                    <ConfirmDeleteButton
                      action={deletePurchaseAction.bind(null, row.id)}
                      itemLabel={`the purchase of ${formatNumber(row.smsQuantity)} SMS from ${row.providerName}`}
                      message="A purchase whose SMS are already allocated to organizations can't be deleted; reduce the allocations first."
                    />
                  </span>
                </TD>
              )}
            </TR>
          );
        })}
      </TBody>
      <tfoot className="border-t-2 border-gray-200 bg-gray-50/60 font-semibold text-gray-800 dark:border-gray-700 dark:bg-white/[0.02] dark:text-white/90">
        <tr>
          <TD colSpan={3} className="text-gray-800 dark:text-white/90">
            {allShown ? "Total" : "Total of this page"}
          </TD>
          <TD className="text-right tabular-nums text-gray-800 dark:text-white/90">{formatNumber(totalSms)}</TD>
          <TD colSpan={2} />
          <TD className="text-right whitespace-nowrap tabular-nums text-gray-800 dark:text-white/90">
            {formatAmount(totalLocal)} {LOCAL_CURRENCY}
          </TD>
          {canManage && <TD />}
        </tr>
      </tfoot>
    </Table>
  );
}
