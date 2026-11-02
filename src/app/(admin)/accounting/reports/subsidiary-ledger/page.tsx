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
import { getLedgerHead, getParties } from "@/modules/accounting/queries";
import type { SubsidiaryLedger } from "@/modules/accounting/types";
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
  const partyId = idParam(query.party);
  const from = dateParam(query.from);
  const to = dateParam(query.to);

  const [parties, head, result] = await Promise.all([
    getParties(),
    accountId ? getLedgerHead(accountId) : Promise.resolve(null),
    accountId
      ? tryApi(() => accountingApi.reports.subsidiaryLedger({ accountId, partyId, from, to }))
      : Promise.resolve(null),
  ]);
  if (!parties.ok) return <Card><ApiErrorState error={parties.error} /></Card>;

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={{ account: accountId, party: partyId, from, to }}>
        <LedgerHeadPartyFilter head={head?.ok ? head.data : null} parties={parties.data} partyId={partyId} />
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
          <ApiErrorState error={result.error} notFoundHint="That ledger head isn't a sub class of the chart of accounts." />
        </Card>
      ) : (
        <LedgerView ledger={result.data} />
      )}
    </div>
  );
}

function LedgerView({ ledger }: { ledger: SubsidiaryLedger }) {
  const period = periodText(ledger.from, ledger.to);
  // With no party chosen, lines that name a supplier or customer show who it was.
  const showParty = !ledger.partyName && ledger.entries.some((entry) => entry.partyName);
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
            ledger.partyName && `${ledger.partyName} (${ledger.partyCode})`,
            period,
            ledger.nature && `${ledger.nature} head`,
          )}
        />
        <ReportTable>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Voucher</TH>
              <TH>Particulars</TH>
              {showParty && <TH>Supplier / customer</TH>}
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
                      {entry.voucherRefNo}
                    </Link>
                    <span className="block text-xs text-gray-500">{entry.voucherType}</span>
                  </TD>
                  <TD className="max-w-56">{entry.particulars ?? "—"}</TD>
                  {showParty && <TD>{entry.partyName ?? "—"}</TD>}
                  <TD className="max-w-72 text-gray-600 dark:text-gray-400">
                    {entry.narration}
                    {entry.chequeNo && <span className="block text-xs text-gray-500">Cheque: {entry.chequeNo}</span>}
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
