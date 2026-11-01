import type { Metadata } from "next";
import Link from "next/link";
import { ClockAlert, Scale, Users, Wallet } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref, firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportDate, ReportFilters, ReportSearch, ReportToggle } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  REPORT_PAGE_SIZE,
  ReportPagination,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  criteriaText,
  dateParam,
  flagParam,
  flagQuery,
} from "@/modules/inventory/components/reports/report-parts";
import { salesApi } from "@/modules/sales/api";
import { BalanceAmount, creditLimitText } from "@/modules/sales/components/reports/report-helpers";
import { SALES_MANAGE_PERMISSION, type CustomerDueRow } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Customer Dues" };

const basePath = "/sales/reports/customer-dues";
const ledgerPath = "/sales/reports/customer-ledger";
type Props = PageProps<"/sales/reports/customer-dues">;

/** An aging bucket amount; empty buckets fade, older overdue buckets stand out. */
function AgingCell({ value, tone }: { value: number; tone?: "warning" | "error" }) {
  return (
    <TD
      className={cn(
        NUM,
        !value && "text-gray-400 dark:text-gray-600",
        Boolean(value) && tone === "warning" && "text-amber-700 dark:text-amber-400",
        Boolean(value) && tone === "error" && "font-medium text-red-600 dark:text-red-400",
      )}
    >
      {value ? formatAmount(value) : "—"}
    </TD>
  );
}

/** The credit limit, flagged when the balance is over it. */
function CreditLimitCell({ row }: { row: CustomerDueRow }) {
  const over = row.creditLimit !== null && row.balance > row.creditLimit ? row.balance - row.creditLimit : 0;
  return (
    <TD className={cn(NUM, row.creditLimit === null && "text-gray-400 dark:text-gray-600")}>
      {creditLimitText(row.creditLimit)}
      {over > 0 && <span className="block text-xs font-medium text-red-600 dark:text-red-400">Over by {formatAmount(over)}</span>}
    </TD>
  );
}

export default function CustomerDuesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Customer Dues"
        description="What each customer owes, aged by how long the invoices are past their due date. Amounts are in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Customer Dues" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={3} columns={11} />}>
        <CustomerDuesReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CustomerDuesReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const asOf = dateParam(query.asOf);
  const includeSettled = flagParam(query.zero);
  const offset = parseOffset(query.offset);

  const result = await tryApi(() =>
    salesApi.reports.customerDues({ search, asOf, onlyWithBalance: !includeSettled, limit: REPORT_PAGE_SIZE, offset }),
  );
  const filters = { q: search, asOf, zero: flagQuery(includeSettled) };
  const filtered = Boolean(search || asOf || includeSettled);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSearch value={search} placeholder="Customer name, code or mobile" />
        <ReportDate name="asOf" label="As of" value={asOf} />
        <ReportToggle name="zero" label="Include settled customers" checked={includeSettled} />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Customers", value: formatNumber(result.data.totalCount), icon: Users },
            {
              label: "Total balance",
              value: <BalanceAmount value={result.data.totals.balance ?? 0} />,
              icon: Scale,
              hint: "Owed by customers, net of advances",
            },
            { label: "Overdue", value: formatAmount(result.data.totals.overdue), icon: ClockAlert, hint: "Past the invoices' due dates" },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Dues by customer"
          description={criteriaText(
            asOf ? `As of ${formatDate(asOf)}` : "As of today",
            includeSettled ? "Settled customers included" : "Customers with a balance",
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={filtered ? "No customers match these filters" : "Nothing owed by customers"}
            description={filtered ? undefined : "Credit sales that aren't fully paid show here."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH className="text-right">Balance</TH>
                  <TH className="text-right">Credit limit</TH>
                  <TH className="text-right">Open invoices</TH>
                  <TH className="text-right">Not due</TH>
                  <TH className="text-right">1–30 days</TH>
                  <TH className="text-right">31–60 days</TH>
                  <TH className="text-right">61–90 days</TH>
                  <TH className="text-right">Over 90</TH>
                  <TH>Oldest due</TH>
                  <TH className="print:hidden">
                    <span className="sr-only">Actions</span>
                  </TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => (
                  <TR key={row.customerId}>
                    <TD>
                      <Link
                        href={buildHref(ledgerPath, { customer: row.customerId })}
                        className="font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90"
                      >
                        {row.customerName}
                      </Link>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {row.customerCode}
                        {row.mobile && ` · ${row.mobile}`}
                      </span>
                    </TD>
                    <TD className={`${NUM} font-semibold text-gray-800 dark:text-white/90`}>
                      <BalanceAmount value={row.balance} showMeaning />
                    </TD>
                    <CreditLimitCell row={row} />
                    <TD className={NUM}>{row.openInvoiceCount ? formatNumber(row.openInvoiceCount) : "—"}</TD>
                    <AgingCell value={row.notDue} />
                    <AgingCell value={row.days1To30} />
                    <AgingCell value={row.days31To60} tone="warning" />
                    <AgingCell value={row.days61To90} tone="warning" />
                    <AgingCell value={row.over90} tone="error" />
                    <TD className="whitespace-nowrap">{formatDate(row.oldestDueDate)}</TD>
                    <TD className="print:hidden">
                      <div className="flex justify-end gap-2">
                        <LinkButton href={buildHref(ledgerPath, { customer: row.customerId })} variant="outline" size="sm">
                          Ledger
                        </LinkButton>
                        {row.balance > 0 && (
                          <PermissionOnly code={SALES_MANAGE_PERMISSION}>
                            <LinkButton href={buildHref("/sales/receipts/new", { customerId: row.customerId })} size="sm">
                              Collect
                            </LinkButton>
                          </PermissionOnly>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </ReportTable>
            <ReportPagination
              basePath={basePath}
              query={filters}
              offset={offset}
              count={result.data.items.length}
              total={result.data.totalCount}
            />
          </>
        )}
      </Card>
    </div>
  );
}
