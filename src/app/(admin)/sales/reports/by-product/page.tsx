import type { Metadata } from "next";
import { Coins, Package, PackageMinus, TrendingUp } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportDate, ReportFilters, ReportSearch, ReportSelect } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  REPORT_PAGE_SIZE,
  ProductCell,
  ReportPagination,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  TotalsFoot,
  categoryOptions,
  criteriaText,
  dateParam,
  idParam,
  optionLabel,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { salesApi } from "@/modules/sales/api";
import { getCustomerFilterOptions } from "@/modules/sales/components/reports/customer-filter";
import { ProfitAmount, marginText, percentText, salesPeriodText } from "@/modules/sales/components/reports/report-helpers";

export const metadata: Metadata = { title: "Sales by Product" };

const basePath = "/sales/reports/by-product";
type Props = PageProps<"/sales/reports/by-product">;

export default function SalesByProductPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Sales by Product"
        description="How much of each product was sold, at what average price and margin, from posted sales less the goods returned in the period. Amounts are in the base currency; the period defaults to this month."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Sales by Product" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={4} columns={11} />}>
        <ByProductReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ByProductReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const customerId = idParam(query.customer);
  const warehouseId = idParam(query.warehouse);
  const categoryId = idParam(query.category);
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [customers, options, result] = await Promise.all([
    getCustomerFilterOptions(customerId),
    getInventoryOptions(),
    tryApi(() =>
      salesApi.reports.byProduct({ search, customerId, warehouseId, categoryId, from, to, limit: REPORT_PAGE_SIZE, offset }),
    ),
  ]);
  const warehouses = warehouseOptions(options);
  const categories = categoryOptions(options);
  const filters = { q: search, customer: customerId, warehouse: warehouseId, category: categoryId, from, to };
  const filtered = Object.values(filters).some((value) => value !== undefined);
  const totals: Partial<Record<string, number>> = result.ok ? result.data.totals : {};

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSearch value={search} placeholder="Product name or code" />
        <ReportSelect name="customer" label="Customer" value={customerId} options={customers} allLabel="All customers" className="w-56" />
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouses} allLabel="All warehouses" />
        <ReportSelect name="category" label="Category" value={categoryId} options={categories} allLabel="All categories" className="w-56" />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Products", value: formatNumber(result.data.totalCount), icon: Package },
            {
              label: "Net sales",
              value: formatAmount(totals.netAmount),
              icon: Coins,
              hint: `After discounts, before tax · Tax ${formatAmount(totals.taxAmount)}`,
            },
            { label: "Cost of goods sold", value: formatAmount(totals.costAmount), icon: PackageMinus, hint: "At average cost when sold" },
            {
              label: "Gross profit",
              value: <ProfitAmount value={totals.profit} />,
              icon: TrendingUp,
              hint: `Margin ${marginText(totals.profit, totals.netAmount)}`,
            },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Sales by product"
          description={criteriaText(
            optionLabel(customers, customerId) ?? "All customers",
            optionLabel(warehouses, warehouseId),
            optionLabel(categories, categoryId),
            salesPeriodText(from, to),
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtered ? "No sales match these filters" : "No posted sales this month"}
            description={filtered ? undefined : "Products show here once sales invoices are posted. Pick a period to see earlier months."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH>Category</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-right">Net sales</TH>
                  <TH className="text-right">Tax</TH>
                  <TH className="text-right">Cost</TH>
                  <TH className="text-right">Profit</TH>
                  <TH className="text-right">Margin</TH>
                  <TH className="text-right">Avg price</TH>
                  <TH className="text-right">Invoices</TH>
                  <TH>Last sale</TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => (
                  <TR key={row.productId}>
                    <TD>
                      <ProductCell name={row.productName} code={row.productCode} />
                    </TD>
                    <TD>{row.categoryName ?? "—"}</TD>
                    <TD className={NUM}>
                      {formatQuantity(row.quantity)} <span className="text-xs text-gray-500">{row.baseUnitCode}</span>
                    </TD>
                    <TD className={`${NUM} font-medium text-gray-800 dark:text-white/90`}>{formatAmount(row.netAmount)}</TD>
                    <TD className={NUM}>{row.taxAmount ? formatAmount(row.taxAmount) : "—"}</TD>
                    <TD className={NUM}>{formatAmount(row.costAmount)}</TD>
                    <TD className={`${NUM} font-medium`}>
                      <ProfitAmount value={row.profit} />
                    </TD>
                    <TD className={cn(NUM, row.marginPercent < 0 && "text-red-600 dark:text-red-400")}>
                      {row.netAmount > 0 ? percentText(row.marginPercent) : "—"}
                    </TD>
                    <TD className={NUM}>
                      {formatAmount(row.averagePrice)} <span className="text-xs text-gray-500">/ {row.baseUnitCode}</span>
                    </TD>
                    <TD className={NUM}>{formatNumber(row.invoiceCount)}</TD>
                    <TD className="whitespace-nowrap">{formatDate(row.lastSaleDate)}</TD>
                  </TR>
                ))}
              </TBody>
              <TotalsFoot>
                <TD colSpan={3}>
                  Total <span className="font-normal text-gray-500">({formatNumber(result.data.totalCount)} products)</span>
                </TD>
                <TD className={NUM}>{formatAmount(totals.netAmount)}</TD>
                <TD className={NUM}>{formatAmount(totals.taxAmount)}</TD>
                <TD className={NUM}>{formatAmount(totals.costAmount)}</TD>
                <TD className={NUM}>
                  <ProfitAmount value={totals.profit} />
                </TD>
                <TD className={NUM}>
                  <span className={(totals.profit ?? 0) < 0 ? "text-red-600 dark:text-red-400" : undefined}>
                    {marginText(totals.profit, totals.netAmount)}
                  </span>
                </TD>
                <TD />
                <TD />
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
