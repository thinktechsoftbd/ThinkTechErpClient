import type { Metadata } from "next";
import { Boxes, Coins, Package } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref, firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportFilters, ReportSearch, ReportSelect, ReportToggle } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  REPORT_PAGE_SIZE,
  ProductCell,
  ReportPagination,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  categoryOptions,
  criteriaText,
  flagParam,
  flagQuery,
  idParam,
  optionLabel,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";

export const metadata: Metadata = { title: "Stock on Hand" };

const basePath = "/inventory/reports/stock-on-hand";
type Props = PageProps<"/inventory/reports/stock-on-hand">;

export default function StockOnHandPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Stock on Hand"
        description="What is in stock now, per product or per product and warehouse, valued at average cost in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Stock on Hand" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={3} columns={8} />}>
        <StockOnHandReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function StockOnHandReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const warehouseId = idParam(query.warehouse);
  const categoryId = idParam(query.category);
  const lowStockOnly = flagParam(query.low);
  const includeZero = flagParam(query.zero);
  const byWarehouse = flagParam(query.byWarehouse);
  const offset = parseOffset(query.offset);

  const [options, result] = await Promise.all([
    getInventoryOptions(),
    tryApi(() =>
      inventoryApi.reports.stockOnHand({
        search,
        warehouseId,
        categoryId,
        lowStockOnly,
        includeZero,
        byWarehouse,
        limit: REPORT_PAGE_SIZE,
        offset,
      }),
    ),
  ]);
  const warehouses = warehouseOptions(options);
  const categories = categoryOptions(options);
  const filters = {
    q: search,
    warehouse: warehouseId,
    category: categoryId,
    low: flagQuery(lowStockOnly),
    zero: flagQuery(includeZero),
    byWarehouse: flagQuery(byWarehouse),
  };
  const filtered = Boolean(search || warehouseId || categoryId || lowStockOnly || includeZero);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSearch value={search} placeholder="Product name or code" />
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouses} allLabel="All warehouses" />
        <ReportSelect name="category" label="Category" value={categoryId} options={categories} allLabel="All categories" className="w-56" />
        <ReportToggle name="byWarehouse" label="Per warehouse" checked={byWarehouse} />
        <ReportToggle name="low" label="Low stock only" checked={lowStockOnly} />
        <ReportToggle name="zero" label="Include zero stock" checked={includeZero} />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: byWarehouse ? "Product & warehouse rows" : "Products", value: formatNumber(result.data.totalCount), icon: Package },
            { label: "Quantity on hand", value: formatQuantity(result.data.totals.quantity), icon: Boxes, hint: "In each product's base unit" },
            { label: "Stock value", value: formatAmount(result.data.totals.stockValue), icon: Coins, hint: "At average cost" },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title={byWarehouse ? "Stock by product and warehouse" : "Stock by product"}
          description={criteriaText(
            optionLabel(warehouses, warehouseId) ?? "All warehouses",
            optionLabel(categories, categoryId),
            search && `“${search}”`,
            lowStockOnly && "At or below reorder level",
            includeZero && "Zero stock included",
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtered ? "No stock matches these filters" : "No stock on hand"}
            description={filtered ? undefined : "Stock shows here once opening stock, a goods receipt or a purchase is posted."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH>Category</TH>
                  {byWarehouse && <TH>Warehouse</TH>}
                  <TH className="text-right">On hand</TH>
                  <TH className="text-right">Reserved</TH>
                  <TH className="text-right">Available</TH>
                  <TH className="text-right">Avg cost</TH>
                  <TH className="text-right">Value</TH>
                  <TH className="text-right">Reorder level</TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => (
                  <TR key={`${row.productId}-${row.warehouseId ?? "all"}`}>
                    <TD>
                      <ProductCell
                        name={row.productName}
                        code={row.productCode}
                        href={buildHref("/inventory/reports/stock-card", {
                          product: row.productId,
                          warehouse: row.warehouseId ?? warehouseId,
                        })}
                      />
                    </TD>
                    <TD>{row.categoryName ?? "—"}</TD>
                    {byWarehouse && <TD className="whitespace-nowrap">{row.warehouseName ?? "—"}</TD>}
                    <TD className={NUM}>
                      <span className={row.quantity < 0 ? "text-red-600 dark:text-red-400" : "font-medium text-gray-800 dark:text-white/90"}>
                        {formatQuantity(row.quantity)}
                      </span>{" "}
                      <span className="text-xs text-gray-500">{row.baseUnitCode}</span>
                    </TD>
                    <TD className={NUM}>{row.reservedQuantity ? formatQuantity(row.reservedQuantity) : "—"}</TD>
                    <TD className={NUM}>{formatQuantity(row.availableQuantity)}</TD>
                    <TD className={NUM}>{formatAmount(row.averageCost)}</TD>
                    <TD className={`${NUM} font-medium`}>{formatAmount(row.stockValue)}</TD>
                    <TD className={NUM}>
                      {row.reorderLevel > 0 ? formatQuantity(row.reorderLevel) : "—"}
                      {row.needsReorder && (
                        <span className="ml-2">
                          <Badge tone="warning">Low</Badge>
                        </span>
                      )}
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
