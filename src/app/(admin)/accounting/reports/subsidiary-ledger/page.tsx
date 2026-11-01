import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, BookText, History, Scale } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { accountingApi } from "@/modules/accounting/api";
import { DrCr, sideAmount } from "@/modules/accounting/components/balance";
import { LedgerHeadPartyFilter } from "@/modules/accounting/components/ledger-filter";
import { loadVoucherEditorOptions } from "@/modules/accounting/editor-data";
import { accountingLabel, type SubsidiaryLedger } from "@/modules/accounting/types";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportDate, ReportFilters } from "@/modules/inventory/components/reports/report-filters";
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

export const metadata: Metadata = { title: "Subsidiary Ledger" };

const basePath = "/accounting/reports/subsidiary-ledger";
type Props = PageProps<"/accounting/reports/subsidiary-ledger">;

export default function SubsidiaryLedgerPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Subsidiary Ledger"
        description="A ledger head's posted entries over a period with the running balance, for one supplier or customer or all of them."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting", href: "/accounting" }, { label: "Subsidiary Ledger" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={4} columns={7} />}>
        <SubsidiaryLedgerReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SubsidiaryLedgerReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const accountId = idParam(query.account);
  const supplierId = idParam(query.supplier);
  const customerId = supplierId ? undefined : idParam(query.customer);
  const from = dateParam(query.from);
  const to = dateParam(query.to);

  const [options, result] = await Promise.all([
    loadVoucherEditorOptions(),
    accountId
      ? tryApi(() => accountingApi.reports.subsidiaryLedger({ accountId, supplierId, customerId, from, to }))
      : Promise.resolve(null),
  ]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={{ account: accountId, supplier: supplierId, customer: customerId, from, to }}>
        <LedgerHeadPartyFilter
          heads={options.data.heads}
          suppliers={options.data.suppliers}
          customers={options.data.customers}
          accountId={accountId}
          partyId={supplierId ?? customerId}
        />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result === null ? (
        <Card>
          <EmptyState
            icon={BookText}
            title="Choose a ledger head"
            description="Pick a ledger head, and optionally a supplier or customer and a period, to see every posted entry with its running balance."
          />
        </Card>
      ) : !result.ok ? (
        <Card>
          <ApiErrorState error={result.error} notFoundHint="That ledger head isn't a sub class in this organization." />
        </Card>
      ) : (
        <LedgerView ledger={result.data} />
      )}
    </div>
  );
}

function LedgerView({ ledger }: { ledger: SubsidiaryLedger }) {
  const period = periodText(ledger.from, ledger.to);
  // With no party chosen, a party head lists each line's supplier or customer.
  const showParty = Boolean(ledger.partyType) && !ledger.partyName;
  const columns = showParty ? 5 : 4;

  return (
    <>
      <ReportSummary
        items={[
          { label: "Opening balance", value: <DrCr value={ledger.openingBalance} />, icon: History, hint: `On ${formatDate(ledger.from)}` },
          { label: "Total debit", value: formatAmount(ledger.totalDebit), icon: ArrowDownLeft, hint: period },
          { label: "Total credit", value: formatAmount(ledger.totalCredit), icon: ArrowUpRight, hint: period },
          { label: "Closing balance", value: <DrCr value={ledger.closingBalance} />, icon: Scale, hint: `On ${formatDate(ledger.to)}` },
        ]}
      />

      <Card>
        <CardHeader
          title={`${ledger.accountCode} ${ledger.accountName}`}
          description={criteriaText(
            ledger.partyName && `${ledger.partyType}: ${ledger.partyName} (${ledger.partyCode})`,
            ledger.partyType && !ledger.partyName && `All ${ledger.partyType.toLowerCase()}s`,
            period,
            `${ledger.nature} head`,
          )}
        />
        <ReportTable>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Voucher</TH>
              <TH>Particulars</TH>
              {showParty && <TH>{ledger.partyType}</TH>}
              <TH>Narration</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Credit</TH>
              <TH className="text-right">Balance</TH>
            </tr>
          </THead>
          <TBody>
            <TR className="bg-gray-50/60 dark:bg-white/[0.02]">
              <TD colSpan={columns + 2} className="font-medium text-gray-800 dark:text-white/90">
                Balance brought forward <span className="font-normal text-gray-500">on {formatDate(ledger.from)}</span>
              </TD>
              <TD className={`${NUM} font-medium`}>
                <DrCr value={ledger.openingBalance} />
              </TD>
            </TR>
            {ledger.entries.length === 0 ? (
              <tr>
                <TD colSpan={columns + 3} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No posted entries in this period.
                </TD>
              </tr>
            ) : (
              ledger.entries.map((entry, index) => (
                <TR key={`${entry.voucherId}-${index}`}>
                  <TD className="whitespace-nowrap">{formatDate(entry.voucherDate)}</TD>
                  <TD className="whitespace-nowrap">
                    <Link href={`/accounting/vouchers/${entry.voucherId}`} className="font-medium text-brand-500 hover:underline">
                      {entry.voucherNo}
                    </Link>
                    <span className="block text-xs text-gray-500">{accountingLabel(entry.voucherType)}</span>
                  </TD>
                  <TD className="max-w-56">{entry.particulars ?? "—"}</TD>
                  {showParty && <TD>{entry.partyName ?? "—"}</TD>}
                  <TD className="max-w-72 text-gray-600 dark:text-gray-400">
                    {entry.narration}
                    {entry.referenceNo && <span className="block text-xs text-gray-500">Ref: {entry.referenceNo}</span>}
                  </TD>
                  <TD className={NUM}>{sideAmount(entry.debitAmount)}</TD>
                  <TD className={NUM}>{sideAmount(entry.creditAmount)}</TD>
                  <TD className={`${NUM} font-medium`}>
                    <DrCr value={entry.balance} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
          <TotalsFoot>
            <TD colSpan={columns}>
              Closing balance <span className="font-normal text-gray-500">on {formatDate(ledger.to)}</span>
            </TD>
            <TD className={NUM}>{formatAmount(ledger.totalDebit)}</TD>
            <TD className={NUM}>{formatAmount(ledger.totalCredit)}</TD>
            <TD className={NUM}>
              <DrCr value={ledger.closingBalance} />
            </TD>
          </TotalsFoot>
        </ReportTable>
      </Card>
    </>
  );
}
