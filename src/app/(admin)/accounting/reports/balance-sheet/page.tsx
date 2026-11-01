import type { Metadata } from "next";
import { CircleCheck, Landmark, Scale, TriangleAlert, Wallet } from "lucide-react";
import { Fragment, Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { TBody, TD, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { accountingApi } from "@/modules/accounting/api";
import { groupBy, parseLevel, rollUp, sum, type ReportLevel } from "@/modules/accounting/report-data";
import { levelName, type AccountBalanceRow, type AccountNature, type BalanceSheet } from "@/modules/accounting/types";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportDate, ReportFilters, ReportSelect } from "@/modules/inventory/components/reports/report-filters";
import { NUM, ReportSkeleton, ReportSummary, ReportTable, TotalsFoot, dateParam } from "@/modules/inventory/components/reports/report-parts";

export const metadata: Metadata = { title: "Balance Sheet" };

const basePath = "/accounting/reports/balance-sheet";
type Props = PageProps<"/accounting/reports/balance-sheet">;

const LEVELS: readonly ReportLevel[] = [2, 3, 4, 5];
const LEVEL_OPTIONS = LEVELS.map((level) => ({ value: String(level), label: level === 5 ? "Sub Class (ledger heads)" : levelName(level) }));

/** A negative amount (e.g. an overdrawn bank on the assets side) in brackets. */
function money(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return rounded < 0 ? `(${formatAmount(-rounded)})` : formatAmount(rounded);
}

export default function BalanceSheetPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Balance Sheet"
        description="What the organization owns and owes on a date: assets against liabilities and equity, with the profit to date under equity."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting", href: "/accounting" }, { label: "Balance Sheet" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={3} columns={2} />}>
        <BalanceSheetReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BalanceSheetReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const asOf = dateParam(query.asOf);
  const level = parseLevel(firstParam(query.level), LEVELS, 3);
  const result = await tryApi(() => accountingApi.reports.balanceSheet({ asOf }));

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={{ asOf, level: level === 3 ? undefined : level }}>
        <ReportDate name="asOf" label="As on" value={asOf} />
        <ReportSelect name="level" label="Show at" value={level} options={LEVEL_OPTIONS} className="w-56" />
      </ReportFilters>
      {!result.ok ? (
        <Card>
          <ApiErrorState error={result.error} />
        </Card>
      ) : (
        <BalanceSheetView sheet={result.data} level={level} />
      )}
    </div>
  );
}

function BalanceSheetView({ sheet, level }: { sheet: BalanceSheet; level: ReportLevel }) {
  const difference = Math.round((sheet.totalAssets - sheet.totalLiabilities - sheet.totalEquity) * 100) / 100;
  const rows = (natures: AccountNature[]) => sheet.rows.filter((row) => natures.includes(row.nature));

  return (
    <>
      <ReportSummary
        items={[
          { label: "Total assets", value: money(sheet.totalAssets), icon: Wallet, hint: `On ${formatDate(sheet.asOf)}` },
          {
            label: "Liabilities and equity",
            value: money(sheet.totalLiabilities + sheet.totalEquity),
            icon: Landmark,
            hint: `Including ${sheet.netProfit < 0 ? "a loss" : "a profit"} of ${formatAmount(Math.abs(sheet.netProfit))} to date`,
          },
          {
            label: difference === 0 ? "Balanced" : "Difference",
            value: formatAmount(Math.abs(difference)),
            icon: difference === 0 ? CircleCheck : TriangleAlert,
            hint: difference === 0 ? "Assets equal liabilities plus equity" : "Assets and liabilities + equity don't agree",
          },
        ]}
      />

      {sheet.rows.length === 0 && sheet.netProfit === 0 ? (
        <Card>
          <EmptyState icon={Scale} title="Nothing posted yet" description="Post vouchers to see the balance sheet." />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-2">
          <Side title="Assets" rows={rows(["Asset"])} level={level} sign={1} total={sheet.totalAssets} totalLabel="Total assets" />
          <Side
            title="Liabilities and equity"
            rows={rows(["Liability", "Equity"])}
            level={level}
            sign={-1}
            netProfit={sheet.netProfit}
            total={sheet.totalLiabilities + sheet.totalEquity}
            totalLabel="Total liabilities and equity"
          />
        </div>
      )}
    </>
  );
}

/**
 * One side of the sheet: each parent class, its account classes and the accounts at `level`
 * under them, with subtotals. `sign` turns debit-minus-credit balances into amounts for the side.
 */
function Side({
  title,
  rows,
  level,
  sign,
  netProfit,
  total,
  totalLabel,
}: {
  title: string;
  rows: AccountBalanceRow[];
  level: ReportLevel;
  sign: 1 | -1;
  /** Shown under the equity parent class (or on its own when there is no equity head yet). */
  netProfit?: number;
  total: number;
  totalLabel: string;
}) {
  const parentClasses = groupBy(rows, (row) => row.parentClassId);
  const hasEquity = rows.some((row) => row.nature === "Equity");
  const profitLine =
    netProfit !== undefined && netProfit !== 0 ? (
      <TR>
        <TD className="pl-10 text-gray-700 italic dark:text-gray-300">{netProfit < 0 ? "Loss to date" : "Profit to date"}</TD>
        <TD className={NUM}>{money(netProfit)}</TD>
      </TR>
    ) : null;

  return (
    <Card className="self-start">
      <CardHeader title={title} />
      <ReportTable>
        <TBody>
          {parentClasses.map(([parentClassId, classRows]) => {
            const first = classRows[0];
            const isEquity = first.nature === "Equity";
            const classTotal = sign * sum(classRows, (row) => row.closingBalance) + (isEquity ? (netProfit ?? 0) : 0);
            const accountClasses = groupBy(classRows, (row) => row.accountClassId);
            return (
              <Fragment key={parentClassId}>
                <TR className="bg-gray-50/60 dark:bg-white/[0.02]">
                  <TD colSpan={2} className="font-semibold text-gray-800 dark:text-white/90">
                    {first.parentClassName}
                  </TD>
                </TR>
                {accountClasses.map(([accountClassId, items]) => {
                  const accountClassTotal = sign * sum(items, (row) => row.closingBalance);
                  if (level === 2)
                    return (
                      <TR key={accountClassId}>
                        <TD className="pl-6">{items[0].accountClassName}</TD>
                        <TD className={NUM}>{money(accountClassTotal)}</TD>
                      </TR>
                    );
                  return (
                    <Fragment key={accountClassId}>
                      <TR>
                        <TD colSpan={2} className="pl-6 font-medium text-gray-700 dark:text-gray-300">
                          {items[0].accountClassName}
                        </TD>
                      </TR>
                      {rollUp(items, level).map((account) => (
                        <TR key={account.id}>
                          <TD className="pl-10">
                            {account.name}
                            <span className="ml-2 font-mono text-xs text-gray-400">{account.code}</span>
                          </TD>
                          <TD className={NUM}>{money(sign * account.closingBalance)}</TD>
                        </TR>
                      ))}
                      <TR>
                        <TD className="pl-6 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                          Total {items[0].accountClassName}
                        </TD>
                        <TD className={cn(NUM, "font-semibold")}>{money(accountClassTotal)}</TD>
                      </TR>
                    </Fragment>
                  );
                })}
                {isEquity && profitLine}
                <TR>
                  <TD className="font-semibold text-gray-800 dark:text-white/90">Total {first.parentClassName}</TD>
                  <TD className={cn(NUM, "font-semibold text-gray-800 dark:text-white/90")}>{money(classTotal)}</TD>
                </TR>
              </Fragment>
            );
          })}
          {!hasEquity && profitLine && (
            <>
              <TR className="bg-gray-50/60 dark:bg-white/[0.02]">
                <TD colSpan={2} className="font-semibold text-gray-800 dark:text-white/90">
                  Equity
                </TD>
              </TR>
              {profitLine}
            </>
          )}
        </TBody>
        <TotalsFoot>
          <TD>{totalLabel}</TD>
          <TD className={NUM}>{money(total)}</TD>
        </TotalsFoot>
      </ReportTable>
    </Card>
  );
}
