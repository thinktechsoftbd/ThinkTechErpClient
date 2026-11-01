import type { Metadata } from "next";
import Link from "next/link";
import { Coins, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportDate, ReportFilters, ReportSearch, ReportSelect } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  REPORT_PAGE_SIZE,
  ReportPagination,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  TotalsFoot,
  criteriaText,
  dateParam,
  idParam,
  optionLabel,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { salesApi } from "@/modules/sales/api";
import { getCustomerFilterOptions } from "@/modules/sales/components/reports/customer-filter";
import { ProfitAmount, marginText, salesPeriodText } from "@/modules/sales/components/reports/report-helpers";
import { customerLabel, type SaleType } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Sales Register" };

const basePath = "/sales/reports/register";
type Props = PageProps<"/sales/reports/register">;

const TYPE_OPTIONS: { value: SaleType; label: string }[] = [
  { value: "Cash", label: "Cash" },
  { value: "Credit", label: "Credit" },
];

export default function SalesRegisterPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Sales Register"
        description="Posted sales invoices with their total, what is still due, the cost of the goods sold and the profit. Amounts are in the base currency; the period defaults to this month."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Sales Register" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={4} columns={10} />}>
        <RegisterReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function RegisterReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const customerId = idParam(query.customer);
  const warehouseId = idParam(query.warehouse);
  const typeParam = firstParam(query.type);
  const saleType = TYPE_OPTIONS.find((option) => option.value === typeParam)?.value;
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [customers, options, result] = await Promise.all([
    getCustomerFilterOptions(customerId),
    getInventoryOptions(),
    tryApi(() =>
      salesApi.reports.register({ search, customerId, warehouseId, saleType, from, to, limit: REPORT_PAGE_SIZE, offset }),
    ),
  ]);
  const warehouses = warehouseOptions(options);
  const filters = { q: search, customer: customerId, warehouse: warehouseId, type: saleType, from, to };
  const filtered = Object.values(filters).some((value) => value !== undefined);
  const totals: Partial<Record<string, number>> = result.ok ? result.data.totals : {};
  // Net of tax and of the returns in the period (the API nets them; older APIs send only the gross figures).
  const netSales = totals.netSales ?? (totals.total !== undefined ? totals.total - (totals.tax ?? 0) : undefined);
  const netProfit = totals.netProfit ?? totals.profit;
  const returns = totals.returns ?? 0;

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSearch value={search} placeholder="Invoice no, customer or mobile" />
        <ReportSelect name="customer" label="Customer" value={customerId} options={customers} allLabel="All customers" className="w-56" />
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouses} allLabel="All warehouses" />
        <ReportSelect name="type" label="Type" value={saleType} options={TYPE_OPTIONS} allLabel="Cash & credit" className="w-36" />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Invoices", value: formatNumber(result.data.totalCount), icon: Receipt },
            {
              label: "Total sales",
              value: formatAmount(totals.total),
              icon: Coins,
              hint: `Tax ${formatAmount(totals.tax)} · Discount ${formatAmount(totals.discount)}${returns ? ` · Returns ${formatAmount(returns)}` : ""}`,
            },
            {
              label: returns ? "Profit after returns" : "Gross profit",
              value: <ProfitAmount value={netProfit} />,
              icon: TrendingUp,
              hint: `Cost ${formatAmount((totals.cost ?? 0) - (totals.returnCost ?? 0))} · Margin ${marginText(netProfit, netSales)}`,
            },
            { label: "Still due", value: formatAmount(totals.due), icon: Wallet, hint: `Paid at sale ${formatAmount(totals.paid)}` },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Posted sales"
          description={criteriaText(
            optionLabel(customers, customerId) ?? "All customers",
            optionLabel(warehouses, warehouseId),
            saleType && `${saleType} sales`,
            salesPeriodText(from, to),
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filtered ? "No sales match these filters" : "No posted sales this month"}
            description={filtered ? undefined : "Sales invoices show here once they are posted. Pick a period to see earlier months."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Invoice</TH>
                  <TH>Date</TH>
                  <TH>Customer</TH>
                  <TH>Type</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Paid</TH>
                  <TH className="text-right">Due</TH>
                  <TH className="text-right">Cost</TH>
                  <TH className="text-right">Profit</TH>
                  <TH>Payment</TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => (
                  <TR key={row.invoiceId}>
                    <TD>
                      <Link
                        href={`/sales/invoices/${row.invoiceId}`}
                        className="font-medium whitespace-nowrap text-brand-500 hover:underline print:text-inherit print:no-underline"
                      >
                        {row.invoiceNo}
                      </Link>
                      {!warehouseId && <span className="block text-xs text-gray-500 dark:text-gray-400">{row.warehouseName}</span>}
                    </TD>
                    <TD className="whitespace-nowrap">{formatDate(row.invoiceDate)}</TD>
                    <TD>
                      {customerLabel(row)}
                      {row.customerMobile && <span className="block text-xs text-gray-500 dark:text-gray-400">{row.customerMobile}</span>}
                    </TD>
                    <TD>
                      <DocumentStatusBadge status={row.saleType} />
                    </TD>
                    <TD className={`${NUM} font-medium text-gray-800 dark:text-white/90`}>{formatAmount(row.totalAmount)}</TD>
                    <TD className={NUM}>{row.paidAmount ? formatAmount(row.paidAmount) : "—"}</TD>
                    <TD className={NUM}>{row.dueAmount > 0 ? formatAmount(row.dueAmount) : "—"}</TD>
                    <TD className={NUM}>{formatAmount(row.costAmount)}</TD>
                    <TD className={`${NUM} font-medium`}>
                      <ProfitAmount value={row.profit} />
                    </TD>
                    <TD>
                      <DocumentStatusBadge status={row.paymentStatus} />
                    </TD>
                  </TR>
                ))}
              </TBody>
              <TotalsFoot>
                <TD colSpan={4}>
                  Total <span className="font-normal text-gray-500">({formatNumber(result.data.totalCount)} invoices)</span>
                </TD>
                <TD className={NUM}>{formatAmount(totals.total)}</TD>
                <TD className={NUM}>{formatAmount(totals.paid)}</TD>
                <TD className={NUM}>{formatAmount(totals.due)}</TD>
                <TD className={NUM}>{formatAmount(totals.cost)}</TD>
                <TD className={NUM}>
                  <ProfitAmount value={totals.profit} />
                </TD>
                <TD />
              </TotalsFoot>
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
