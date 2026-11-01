import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, CircleCheck, Scale, TriangleAlert } from "lucide-react";
import { Fragment, Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { accountingApi } from "@/modules/accounting/api";
import { sideAmount } from "@/modules/accounting/components/balance";
import { groupBy, parseLevel, rollUp, split, sum, type ReportLevel, type RolledUp } from "@/modules/accounting/report-data";
import { levelName, type TrialBalance } from "@/modules/accounting/types";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportDate, ReportFilters, ReportSelect, ReportToggle } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  TotalsFoot,
  criteriaText,
  dateParam,
  flagParam,
  flagQuery,
  periodText,
} from "@/modules/inventory/components/reports/report-parts";

export const metadata: Metadata = { title: "Trial Balance" };

const basePath = "/accounting/reports/trial-balance";
type Props = PageProps<"/accounting/reports/trial-balance">;

const LEVELS: readonly ReportLevel[] = [5, 4, 3, 2, 1];
const LEVEL_OPTIONS = LEVELS.map((level) => ({ value: String(level), label: level === 5 ? "Sub Class (ledger heads)" : levelName(level) }));

export default function TrialBalancePage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Trial Balance"
        description="Every ledger head's balance before the period, its debits and credits in it, and its closing balance. Debits equal credits when the books balance."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting", href: "/accounting" }, { label: "Trial Balance" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={3} columns={8} />}>
        <TrialBalanceReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TrialBalanceReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const level = parseLevel(firstParam(query.level), LEVELS, 5);
  const includeZero = flagParam(query.zero);

  const result = await tryApi(() => accountingApi.reports.trialBalance({ from, to, includeZero: includeZero || undefined }));

  return (
    <div className="space-y-6">
      <ReportFilters
        basePath={basePath}
        query={{ from, to, level: level === 5 ? undefined : level, zero: flagQuery(includeZero) }}
      >
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
        <ReportSelect name="level" label="Show at" value={level} options={LEVEL_OPTIONS} className="w-56" />
        <ReportToggle name="zero" label="Include heads with no balance" checked={includeZero} />
      </ReportFilters>
      {!result.ok ? (
        <Card>
          <ApiErrorState error={result.error} />
        </Card>
      ) : (
        <TrialBalanceView report={result.data} level={level} />
      )}
    </div>
  );
}

function AmountCells({ row, strong }: { row: Pick<RolledUp, "openingBalance" | "periodDebit" | "periodCredit" | "closingBalance">; strong?: boolean }) {
  const opening = split(row.openingBalance);
  const closing = split(row.closingBalance);
  const cell = cn(NUM, strong && "font-semibold text-gray-800 dark:text-white/90");
  return (
    <>
      <TD className={cell}>{sideAmount(opening.debit)}</TD>
      <TD className={cell}>{sideAmount(opening.credit)}</TD>
      <TD className={cell}>{sideAmount(row.periodDebit)}</TD>
      <TD className={cell}>{sideAmount(row.periodCredit)}</TD>
      <TD className={cell}>{sideAmount(closing.debit)}</TD>
      <TD className={cell}>{sideAmount(closing.credit)}</TD>
    </>
  );
}

function totals(items: RolledUp[]) {
  return {
    openingBalance: sum(items, (i) => i.openingBalance),
    periodDebit: sum(items, (i) => i.periodDebit),
    periodCredit: sum(items, (i) => i.periodCredit),
    closingBalance: sum(items, (i) => i.closingBalance),
  };
}

function TrialBalanceView({ report, level }: { report: TrialBalance; level: ReportLevel }) {
  const period = periodText(report.from, report.to);
  const accounts = rollUp(report.rows, level);
  // Totals of the rows shown: summarising nets debit and credit balances within an account.
  const opening = { debit: sum(accounts, (a) => split(a.openingBalance).debit), credit: sum(accounts, (a) => split(a.openingBalance).credit) };
  const closing = { debit: sum(accounts, (a) => split(a.closingBalance).debit), credit: sum(accounts, (a) => split(a.closingBalance).credit) };
  const difference = Math.round((closing.debit - closing.credit) * 100) / 100;
  const sections = level === 1 ? [] : groupBy(accounts, (account) => account.parentClassId);
  const parentClasses = new Map(report.rows.map((row) => [row.parentClassId, `${row.parentClassCode} ${row.parentClassName}`]));

  return (
    <>
      <ReportSummary
        items={[
          { label: "Closing debits", value: formatAmount(closing.debit), icon: ArrowDownLeft, hint: `Debit balances on ${formatDate(report.to)}` },
          { label: "Closing credits", value: formatAmount(closing.credit), icon: ArrowUpRight, hint: `Credit balances on ${formatDate(report.to)}` },
          {
            label: difference === 0 ? "Balanced" : "Difference",
            value: formatAmount(Math.abs(difference)),
            icon: difference === 0 ? CircleCheck : TriangleAlert,
            hint: difference === 0 ? "Debits equal credits" : "Debits and credits don't agree",
          },
        ]}
      />

      <Card>
        <CardHeader
          title="Trial balance"
          description={criteriaText(period, `At ${level === 5 ? "ledger head" : levelName(level).toLowerCase()} level`, "Posted vouchers only")}
        />
        {report.rows.length === 0 ? (
          <EmptyState icon={Scale} title="Nothing posted yet" description="Post vouchers to see the ledger heads' balances here." />
        ) : (
          <ReportTable>
            <THead>
              <tr>
                <TH rowSpan={2}>Code</TH>
                <TH rowSpan={2}>Account</TH>
                <TH colSpan={2} className="text-center">
                  Opening
                </TH>
                <TH colSpan={2} className="text-center">
                  During the period
                </TH>
                <TH colSpan={2} className="text-center">
                  Closing
                </TH>
              </tr>
              <tr>
                <TH className="text-right">Debit</TH>
                <TH className="text-right">Credit</TH>
                <TH className="text-right">Debit</TH>
                <TH className="text-right">Credit</TH>
                <TH className="text-right">Debit</TH>
                <TH className="text-right">Credit</TH>
              </tr>
            </THead>
            <TBody>
              {level === 1
                ? accounts.map((account) => (
                    <TR key={account.id}>
                      <TD className="font-mono text-xs text-gray-500">{account.code}</TD>
                      <TD className="font-medium text-gray-800 dark:text-white/90">{account.name}</TD>
                      <AmountCells row={account} />
                    </TR>
                  ))
                : sections.map(([parentClassId, items]) => (
                    <Fragment key={parentClassId}>
                      <TR className="bg-gray-50/60 dark:bg-white/[0.02]">
                        <TD colSpan={8} className="font-semibold text-gray-800 dark:text-white/90">
                          {parentClasses.get(parentClassId)}
                        </TD>
                      </TR>
                      {items.map((account) => (
                        <TR key={account.id}>
                          <TD className="pl-8 font-mono text-xs text-gray-500">{account.code}</TD>
                          <TD>{account.name}</TD>
                          <AmountCells row={account} />
                        </TR>
                      ))}
                      <TR>
                        <TD />
                        <TD className="text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Total</TD>
                        <AmountCells row={totals(items)} strong />
                      </TR>
                    </Fragment>
                  ))}
            </TBody>
            <TotalsFoot>
              <TD colSpan={2}>Grand total</TD>
              <TD className={NUM}>{formatAmount(opening.debit)}</TD>
              <TD className={NUM}>{formatAmount(opening.credit)}</TD>
              <TD className={NUM}>{formatAmount(report.periodDebit)}</TD>
              <TD className={NUM}>{formatAmount(report.periodCredit)}</TD>
              <TD className={NUM}>{formatAmount(closing.debit)}</TD>
              <TD className={NUM}>{formatAmount(closing.credit)}</TD>
            </TotalsFoot>
          </ReportTable>
        )}
      </Card>
    </>
  );
}
