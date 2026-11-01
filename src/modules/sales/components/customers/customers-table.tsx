import Link from "next/link";
import { BookOpen, HandCoins } from "lucide-react";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton, rowActionClass } from "@/core/crud/form-modal-button";
import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatAmount } from "@/core/utils/number";
import type { LookupOption } from "@/modules/settings/types";
import { deleteCustomerAction, saveCustomerAction } from "../../actions/customers";
import type { Customer } from "../../types";
import { CustomerFields } from "./customer-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function customerLedgerHref(customerId: number) {
  return `/sales/reports/customer-ledger?customer=${customerId}`;
}

/** A new money receipt for the customer, with their open invoices loaded. */
export function collectDuesHref(customerId: number) {
  return `/sales/receipts/new?customerId=${customerId}`;
}

/** What the customer owes (+) or has paid in advance (-). */
function CustomerBalance({ balance }: { balance: number }) {
  if (balance === 0) return <span className={`tabular-nums ${muted}`}>{formatAmount(0)}</span>;
  const owes = balance > 0;
  return (
    <span className="tabular-nums">
      <span className={owes ? "font-medium text-gray-800 dark:text-white/90" : "font-medium text-green-700 dark:text-green-400"}>
        {formatAmount(Math.abs(balance))}
      </span>
      <span className={`block text-xs ${muted}`}>{owes ? "owes" : "advance"}</span>
    </span>
  );
}

function paymentTerms(days: number) {
  if (days === 0) return "due on the day";
  return days === 1 ? "1 day terms" : `${days} days terms`;
}

/** Null = no limit, 0 = cash only. */
function CreditLimit({ limit, termsDays }: { limit: number | null; termsDays: number }) {
  return (
    <>
      {limit === null ? (
        <span className={muted}>No limit</span>
      ) : limit === 0 ? (
        "Cash only"
      ) : (
        <span className="tabular-nums">{formatAmount(limit)}</span>
      )}
      {limit !== 0 && <span className={`block text-xs ${muted}`}>{paymentTerms(termsDays)}</span>}
    </>
  );
}

export function CustomersTable({
  rows,
  groups,
  canManage,
}: {
  rows: Customer[];
  /** For the edit modal's group picker. */
  groups: LookupOption[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Code</TH>
          <TH>Customer</TH>
          <TH>Mobile</TH>
          <TH>Group</TH>
          <TH className="text-right">Credit limit</TH>
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
                href={customerLedgerHref(row.id)}
                className="font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90"
                title={`Open the ledger of ${row.name}`}
              >
                {row.name}
              </Link>
              {(row.contactPerson || row.city) && (
                <span className={`block text-xs ${muted}`}>{[row.contactPerson, row.city].filter(Boolean).join(" · ")}</span>
              )}
            </TD>
            <TD className={row.mobile ? "whitespace-nowrap tabular-nums" : muted}>
              {row.mobile ?? "—"}
              {row.phone && <span className={`block text-xs ${muted}`}>{row.phone}</span>}
            </TD>
            <TD className={row.customerGroup ? undefined : muted}>{row.customerGroup ?? "—"}</TD>
            <TD className="text-right whitespace-nowrap">
              <CreditLimit limit={row.creditLimit} termsDays={row.paymentTermsDays} />
            </TD>
            <TD className="text-right whitespace-nowrap">
              <CustomerBalance balance={row.balance} />
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            <TD className="text-right">
              <span className="inline-flex items-center gap-1">
                {canManage && row.balance > 0 && (
                  <Link href={collectDuesHref(row.id)} className={rowActionClass} title={`Record a money receipt from ${row.name}`}>
                    <HandCoins className="size-4" aria-hidden /> Collect
                  </Link>
                )}
                <Link href={customerLedgerHref(row.id)} className={rowActionClass}>
                  <BookOpen className="size-4" aria-hidden /> Ledger
                </Link>
                {canManage && (
                  <>
                    <FormModalButton
                      mode="edit"
                      label="Edit"
                      title="Edit customer"
                      description={`${row.code} · ${row.name}`}
                      action={saveCustomerAction.bind(null, row.id)}
                      submitLabel="Save changes"
                      size="lg"
                    >
                      <CustomerFields value={row} groups={groups} />
                    </FormModalButton>
                    <ConfirmDeleteButton
                      action={deleteCustomerAction.bind(null, row.id)}
                      itemLabel={`customer "${row.name}"`}
                      message="A customer with sales documents (invoices, returns or receipts) can't be deleted; deactivate it instead."
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
