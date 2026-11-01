import type { Metadata } from "next";
import { Coins, Package, Percent } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
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
  periodText,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { purchaseApi } from "@/modules/purchase/api";
import { supplierOptions } from "@/modules/purchase/components/reports/report-helpers";
import { getSupplierOptions } from "@/modules/purchase/queries";

export const metadata: Metadata = { title: "Purchase by Product" };

const basePath = "/purchase/reports/by-product";
type Props = PageProps<"/purchase/reports/by-product">;

export default function PurchaseByProductPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Purchase by Product"
        description="How much of each product was bought, at what average price, from posted invoices. Amounts are in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Purchase by Product" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={3} columns={8} />}>
        <ByProductReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ByProductReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const supplierId = idParam(query.supplier);
  const categoryId = idParam(query.category);
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [suppliers, options, result] = await Promise.all([
    getSupplierOptions(),
    getInventoryOptions(),
    tryApi(() => purchaseApi.reports.byProduct({ search, supplierId, categoryId, from, to, limit: REPORT_PAGE_SIZE, offset })),
  ]);
  const supplierList = supplierOptions(suppliers);
  const categories = categoryOptions(options);
  const filters = { q: search, supplier: supplierId, category: categoryId, from, to };
  const filtered = Object.values(filters).some((value) => value !== undefined);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSearch value={search} placeholder="Product name or code" />
        <ReportSelect name="supplier" label="Supplier" value={supplierId} options={supplierList} allLabel="All suppliers" className="w-56" />
        <ReportSelect name="category" label="Category" value={categoryId} options={categories} allLabel="All categories" className="w-56" />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Products", value: formatNumber(result.data.totalCount), icon: Package },
            { label: "Net purchases", value: formatAmount(result.data.totals.netAmount), icon: Coins, hint: "After discounts, before tax" },
            { label: "Tax", value: formatAmount(result.data.totals.taxAmount), icon: Percent },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Purchases by product"
          description={criteriaText(
            optionLabel(supplierList, supplierId) ?? "All suppliers",
            optionLabel(categories, categoryId),
            periodText(from, to),
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtered ? "No purchases match these filters" : "No posted purchases yet"}
            description={filtered ? undefined : "Products show here once purchase invoices are posted."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH>Category</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-right">Avg price</TH>
                  <TH className="text-right">Net amount</TH>
                  <TH className="text-right">Tax</TH>
                  <TH className="text-right">Invoices</TH>
                  <TH>Last purchase</TH>
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
                    <TD className={NUM}>
                      {formatAmount(row.averagePrice)} <span className="text-xs text-gray-500">/ {row.baseUnitCode}</span>
                    </TD>
                    <TD className={`${NUM} font-medium text-gray-800 dark:text-white/90`}>{formatAmount(row.netAmount)}</TD>
                    <TD className={NUM}>{row.taxAmount ? formatAmount(row.taxAmount) : "—"}</TD>
                    <TD className={NUM}>{formatNumber(row.invoiceCount)}</TD>
                    <TD className="whitespace-nowrap">{formatDate(row.lastPurchaseDate)}</TD>
                  </TR>
                ))}
              </TBody>
              <TotalsFoot>
                <TD colSpan={4}>
                  Total <span className="font-normal text-gray-500">({formatNumber(result.data.totalCount)} products)</span>
                </TD>
                <TD className={NUM}>{formatAmount(result.data.totals.netAmount)}</TD>
                <TD className={NUM}>{formatAmount(result.data.totals.taxAmount)}</TD>
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
