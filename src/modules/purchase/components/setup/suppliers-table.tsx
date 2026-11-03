import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton, rowActionClass } from "@/core/crud/form-modal-button";
import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatAmount } from "@/core/utils/number";
import { MappedLedgerHead } from "@/modules/accounting/components/pickers";
import type { LookupOption } from "@/modules/settings/types";
import { deleteSupplierAction, saveSupplierAction } from "../../actions/setup";
import type { Supplier } from "../../types";
import { SupplierFields } from "./supplier-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function supplierLedgerHref(supplierId: number) {
  return `/purchase/reports/supplier-ledger?supplier=${supplierId}`;
}

/** What is owed to the supplier (+) or advanced to them (-). */
function SupplierBalance({ balance }: { balance: number }) {
  if (balance === 0) return <span className={`tabular-nums ${muted}`}>{formatAmount(0)}</span>;
  const owed = balance > 0;
  return (
    <span className="tabular-nums">
      <span className={owed ? "font-medium text-gray-800 dark:text-white/90" : "font-medium text-green-700 dark:text-green-400"}>
        {formatAmount(Math.abs(balance))}
      </span>
      <span className={`block text-xs ${muted}`}>{owed ? "owed" : "advance"}</span>
    </span>
  );
}

function paymentTerms(days: number) {
  if (days === 0) return "Immediate";
  return days === 1 ? "1 day" : `${days} days`;
}

export function SuppliersTable({
  rows,
  groups,
  currencies,
  canManage,
}: {
  rows: Supplier[];
  /** For the edit modal's pickers. */
  groups: LookupOption[];
  currencies: LookupOption[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Code</TH>
          <TH>Supplier</TH>
          <TH>Group</TH>
          <TH>Ledger head</TH>
          <TH>Terms</TH>
          <TH className="text-right">Balance</TH>
          <TH>Status</TH>
          <TH className="text-right">Actions</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="font-mono text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">{row.code}</TD>
            <TD>
              <Link
                href={supplierLedgerHref(row.id)}
                className="font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90"
                title={`Open the ledger of ${row.name}`}
              >
                {row.name}
              </Link>
              {(row.mobile || row.contactPerson) && (
                <span className={`block text-xs ${muted}`}>
                  {[row.mobile, row.contactPerson].filter(Boolean).join(" · ")}
                </span>
              )}
            </TD>
            <TD className={row.supplierGroup ? undefined : muted}>{row.supplierGroup ?? "—"}</TD>
            <TD>
              <MappedLedgerHead row={row} />
            </TD>
            <TD className="whitespace-nowrap">
              {paymentTerms(row.paymentTermsDays)}
              {row.creditLimit !== null && <span className={`block text-xs ${muted}`}>limit {formatAmount(row.creditLimit)}</span>}
            </TD>
            <TD className="text-right whitespace-nowrap">
              <SupplierBalance balance={row.balance} />
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            <TD className="text-right">
              <span className="inline-flex items-center gap-1">
                <Link href={supplierLedgerHref(row.id)} className={rowActionClass}>
                  <BookOpen className="size-4" aria-hidden /> Ledger
                </Link>
                {canManage && (
                  <>
                    <FormModalButton
                      mode="edit"
                      label="Edit"
                      title="Edit supplier"
                      description={`${row.code} · ${row.name}`}
                      action={saveSupplierAction.bind(null, row.id)}
                      submitLabel="Save changes"
                      size="lg"
                    >
                      <SupplierFields value={row} groups={groups} currencies={currencies} />
                    </FormModalButton>
                    <ConfirmDeleteButton
                      action={deleteSupplierAction.bind(null, row.id)}
                      itemLabel={`supplier "${row.name}"`}
                      message="A supplier used on purchases, returns or payments can't be deleted; deactivate it instead."
                    />
                  </>
                )}
              </span>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
