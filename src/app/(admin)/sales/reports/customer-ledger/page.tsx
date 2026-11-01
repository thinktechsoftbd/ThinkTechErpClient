import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, BookText, History, Scale } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportDate, ReportFilters, ReportSelect } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  TotalsFoot,
  criteriaText,
  dateParam,
  idParam,
  periodText,
} from "@/modules/inventory/components/reports/report-parts";
import { salesApi } from "@/modules/sales/api";
import { getCustomerFilterOptions } from "@/modules/sales/components/reports/customer-filter";
import { LedgerEntryLink } from "@/modules/sales/components/reports/ledger-entry-link";
import { BalanceAmount, balanceMeaning } from "@/modules/sales/components/reports/report-helpers";
import { SALES_MANAGE_PERMISSION, salesLabel, type CustomerLedger } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Customer Ledger" };

const basePath = "/sales/reports/customer-ledger";
type Props = PageProps<"/sales/reports/customer-ledger">;

/** A ledger entry's type: an opening entry dated in the period reads as the customer's opening balance. */
function entryLabel(entryType: string) {
  return entryType === "Opening" ? "Opening balance" : salesLabel(entryType);
}

export default function CustomerLedgerPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Customer Ledger"
        description="A customer's sales, returns, receipts and refunds over a period, with the running balance in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Customer Ledger" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={4} columns={6} />}>
        <CustomerLedgerReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CustomerLedgerReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const customerId = idParam(query.customer);
  const from = dateParam(query.from);
  const to = dateParam(query.to);

  const [customers, result] = await Promise.all([
    getCustomerFilterOptions(customerId),
    customerId ? tryApi(() => salesApi.reports.customerLedger({ customerId, from, to })) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={{ customer: customerId, from, to }}>
        <ReportSelect
          name="customer"
          label="Customer"
          value={customerId}
          options={customers}
          allLabel="Choose a customer"
          className="w-full sm:w-72"
        />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result === null ? (
        <Card>
          <EmptyState
            icon={BookText}
            title="Choose a customer"
            description="Pick a customer, and optionally a period, to see every entry with its running balance. The period defaults to this month."
          />
        </Card>
      ) : !result.ok ? (
        <Card>
          <ApiErrorState error={result.error} notFoundHint="That customer isn't in this organization." />
        </Card>
      ) : (
        <LedgerView ledger={result.data} />
      )}
    </div>
  );
}

function LedgerView({ ledger }: { ledger: CustomerLedger }) {
  return (
    <>
      <ReportSummary
        items={[
          { label: "Opening balance", value: <BalanceAmount value={ledger.openingBalance} />, icon: History, hint: `On ${formatDate(ledger.from)}` },
          { label: "Total debit", value: formatAmount(ledger.totalDebit), icon: ArrowUpRight, hint: "Sales and refunds" },
          { label: "Total credit", value: formatAmount(ledger.totalCredit), icon: ArrowDownLeft, hint: "Money received and returns" },
          {
            label: "Closing balance",
            value: <BalanceAmount value={ledger.closingBalance} />,
            icon: Scale,
            hint: `${balanceMeaning(ledger.closingBalance)} on ${formatDate(ledger.to)}`,
          },
        ]}
      />

      <Card>
        <CardHeader
          title={`${ledger.customerName} (${ledger.customerCode})`}
          description={criteriaText(
            ledger.mobile,
            periodText(ledger.from, ledger.to),
            "+ balance is owed by the customer, − is an advance",
          )}
          actions={
            <div className="flex gap-2 print:hidden">
              <LinkButton href={`/sales/customers/${ledger.customerId}`} variant="outline" size="sm">
                Customer
              </LinkButton>
              {ledger.closingBalance > 0 && (
                <PermissionOnly code={SALES_MANAGE_PERMISSION}>
                  <LinkButton href={buildHref("/sales/receipts/new", { customerId: ledger.customerId })} size="sm">
                    Collect
                  </LinkButton>
                </PermissionOnly>
              )}
            </div>
          }
        />
        <ReportTable>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Entry</TH>
              <TH>Document</TH>
              <TH className="text-right">Debit (sale)</TH>
              <TH className="text-right">Credit (received)</TH>
              <TH className="text-right">Balance</TH>
            </tr>
          </THead>
          <TBody>
            <TR className="bg-gray-50/60 dark:bg-white/[0.02]">
              <TD colSpan={3} className="font-medium text-gray-800 dark:text-white/90">
                Balance brought forward <span className="font-normal text-gray-500">on {formatDate(ledger.from)}</span>
              </TD>
              <TD className={NUM} />
              <TD className={NUM} />
              <TD className={`${NUM} font-medium`}>
                <BalanceAmount value={ledger.openingBalance} />
              </TD>
            </TR>
            {ledger.entries.length === 0 ? (
              <tr>
                <TD colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No entries in this period.
                </TD>
              </tr>
            ) : (
              ledger.entries.map((entry, index) => (
                <TR key={`${entry.entryType}-${entry.documentId ?? "none"}-${index}`}>
                  <TD className="whitespace-nowrap">{formatDate(entry.entryDate)}</TD>
                  <TD className="whitespace-nowrap">{entryLabel(entry.entryType)}</TD>
                  <TD>
                    <LedgerEntryLink entryType={entry.entryType} documentId={entry.documentId} documentNo={entry.documentNo} />
                  </TD>
                  <TD className={NUM}>{entry.debitAmount ? formatAmount(entry.debitAmount) : ""}</TD>
                  <TD className={NUM}>{entry.creditAmount ? formatAmount(entry.creditAmount) : ""}</TD>
                  <TD className={`${NUM} font-medium`}>
                    <BalanceAmount value={entry.balance} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
          <TotalsFoot>
            <TD colSpan={3}>
              Closing balance <span className="font-normal text-gray-500">on {formatDate(ledger.to)}</span>
            </TD>
            <TD className={NUM}>{formatAmount(ledger.totalDebit)}</TD>
            <TD className={NUM}>{formatAmount(ledger.totalCredit)}</TD>
            <TD className={NUM}>
              <BalanceAmount value={ledger.closingBalance} />
            </TD>
          </TotalsFoot>
        </ReportTable>
      </Card>
    </>
  );
}
