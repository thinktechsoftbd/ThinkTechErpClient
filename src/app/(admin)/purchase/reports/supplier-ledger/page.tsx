import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, BookText, History, Scale } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
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
import { canManagePurchase } from "@/modules/purchase/access";
import { purchaseApi } from "@/modules/purchase/api";
import { LedgerEntryLink } from "@/modules/purchase/components/reports/ledger-entry-link";
import { BalanceAmount, balanceMeaning, supplierOptions } from "@/modules/purchase/components/reports/report-helpers";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { purchaseLabel, type SupplierLedger } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Supplier Ledger" };

const basePath = "/purchase/reports/supplier-ledger";
type Props = PageProps<"/purchase/reports/supplier-ledger">;

export default function SupplierLedgerPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Supplier Ledger"
        description="A supplier's invoices, returns, payments and refunds over a period, with the running balance in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Supplier Ledger" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={4} columns={6} />}>
        <SupplierLedgerReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SupplierLedgerReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const supplierId = idParam(query.supplier);
  const from = dateParam(query.from);
  const to = dateParam(query.to);

  const [session, suppliers, result] = await Promise.all([
    requireSession(),
    getSupplierOptions(),
    supplierId ? tryApi(() => purchaseApi.reports.supplierLedger({ supplierId, from, to })) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={{ supplier: supplierId, from, to }}>
        <ReportSelect
          name="supplier"
          label="Supplier"
          value={supplierId}
          options={supplierOptions(suppliers)}
          allLabel="Choose a supplier"
          className="w-full sm:w-72"
        />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result === null ? (
        <Card>
          <EmptyState
            icon={BookText}
            title="Choose a supplier"
            description="Pick a supplier, and optionally a period, to see every entry with its running balance."
          />
        </Card>
      ) : !result.ok ? (
        <Card>
          <ApiErrorState error={result.error} notFoundHint="That supplier isn't in this organization." />
        </Card>
      ) : (
        <LedgerView ledger={result.data} canPay={canManagePurchase(session)} />
      )}
    </div>
  );
}

function LedgerView({ ledger, canPay }: { ledger: SupplierLedger; canPay: boolean }) {
  return (
    <>
      <ReportSummary
        items={[
          { label: "Opening balance", value: <BalanceAmount value={ledger.openingBalance} />, icon: History, hint: `On ${formatDate(ledger.from)}` },
          { label: "Total debit", value: formatAmount(ledger.totalDebit), icon: ArrowDownLeft, hint: periodText(ledger.from, ledger.to) },
          { label: "Total credit", value: formatAmount(ledger.totalCredit), icon: ArrowUpRight, hint: periodText(ledger.from, ledger.to) },
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
          title={`${ledger.supplierName} (${ledger.supplierCode})`}
          description={criteriaText(periodText(ledger.from, ledger.to), "+ balance is owed to the supplier, − is an advance")}
          actions={
            <div className="flex gap-2 print:hidden">
              <LinkButton href={`/purchase/suppliers/${ledger.supplierId}`} variant="outline" size="sm">
                Supplier
              </LinkButton>
              {canPay && ledger.closingBalance > 0 && (
                <LinkButton href={buildHref("/purchase/payments/new", { supplierId: ledger.supplierId })} size="sm">
                  Pay
                </LinkButton>
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
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Credit</TH>
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
                  <TD className="whitespace-nowrap">{purchaseLabel(entry.entryType)}</TD>
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
