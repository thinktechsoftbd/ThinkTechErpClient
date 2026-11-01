import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, ChartPie, Coins, Layers } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref, firstParam } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportFilters, ReportSelect } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  ShareBar,
  TotalsFoot,
  criteriaText,
  idParam,
  optionLabel,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";
import type { StockValuationRow } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Stock Valuation" };

const basePath = "/inventory/reports/valuation";
type Props = PageProps<"/inventory/reports/valuation">;

type GroupBy = "category" | "warehouse" | "brand";

const GROUP_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "warehouse", label: "Warehouse" },
  { value: "brand", label: "Brand" },
];

const GROUP_NOUNS: Record<GroupBy, string> = { category: "Categories", warehouse: "Warehouses", brand: "Brands" };

function parseGroup(value: string | string[] | undefined): GroupBy {
  const raw = firstParam(value);
  return raw === "warehouse" || raw === "brand" ? raw : "category";
}

export default function ValuationPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Stock Valuation"
        description="The value of the stock on hand at average cost in the base currency, by category, warehouse or brand."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Stock Valuation" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={3} columns={5} />}>
        <ValuationReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Stock on hand narrowed to one group, when that report has the filter. */
function drillDownHref(groupBy: GroupBy, row: StockValuationRow, warehouseId: number | undefined) {
  if (row.groupId === null) return null;
  if (groupBy === "category") {
    return buildHref("/inventory/reports/stock-on-hand", { category: row.groupId, warehouse: warehouseId });
  }
  if (groupBy === "warehouse") {
    return buildHref("/inventory/reports/stock-on-hand", { warehouse: row.groupId, byWarehouse: "true" });
  }
  return null;
}

async function ValuationReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const groupBy = parseGroup(query.group);
  const warehouseId = idParam(query.warehouse);

  const [options, result] = await Promise.all([
    getInventoryOptions(),
    tryApi(() => inventoryApi.reports.valuation({ groupBy, warehouseId })),
  ]);
  const warehouses = warehouseOptions(options);
  const filters = { group: groupBy === "category" ? undefined : groupBy, warehouse: warehouseId };

  const rows = result.ok ? [...result.data].sort((a, b) => b.stockValue - a.stockValue) : [];
  const totalValue = rows.reduce((sum, row) => sum + row.stockValue, 0);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  // A product sits in one category and one brand, but can be stocked in several warehouses.
  const totalProducts = groupBy === "warehouse" ? null : rows.reduce((sum, row) => sum + row.productCount, 0);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSelect name="group" label="Group by" value={groupBy} options={GROUP_OPTIONS} className="w-40" />
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouses} allLabel="All warehouses" />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Stock value", value: formatAmount(totalValue), icon: Coins, hint: "At average cost" },
            { label: "Quantity on hand", value: formatQuantity(totalQuantity), icon: Boxes, hint: "In each product's base unit" },
            { label: GROUP_NOUNS[groupBy], value: formatNumber(rows.length), icon: Layers },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title={`Stock value by ${groupBy}`}
          description={criteriaText(optionLabel(warehouses, warehouseId) ?? "All warehouses")}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState icon={ChartPie} title="No stock to value" description="Stock shows here once opening stock or a purchase is posted." />
        ) : (
          <ReportTable>
            <THead>
              <tr>
                <TH>{GROUP_OPTIONS.find((option) => option.value === groupBy)?.label}</TH>
                <TH className="text-right">Products</TH>
                <TH className="text-right">Quantity</TH>
                <TH className="text-right">Value</TH>
                <TH className="text-right">Share of value</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => {
                const href = drillDownHref(groupBy, row, warehouseId);
                const name = row.groupName || "Not set";
                return (
                  <TR key={row.groupId ?? "none"}>
                    <TD>
                      {href ? (
                        <Link href={href} className="font-medium text-gray-800 hover:text-brand-500 hover:underline dark:text-white/90">
                          {name}
                        </Link>
                      ) : (
                        <span className={row.groupId === null ? "text-gray-500 italic" : "font-medium text-gray-800 dark:text-white/90"}>
                          {name}
                        </span>
                      )}
                    </TD>
                    <TD className={NUM}>{formatNumber(row.productCount)}</TD>
                    <TD className={NUM}>{formatQuantity(row.quantity)}</TD>
                    <TD className={`${NUM} font-medium`}>{formatAmount(row.stockValue)}</TD>
                    <TD className="w-64">
                      <ShareBar share={totalValue > 0 ? row.stockValue / totalValue : 0} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
            <TotalsFoot>
              <TD>Grand total</TD>
              <TD className={NUM}>{totalProducts === null ? "—" : formatNumber(totalProducts)}</TD>
              <TD className={NUM}>{formatQuantity(totalQuantity)}</TD>
              <TD className={NUM}>{formatAmount(totalValue)}</TD>
              <TD className={NUM}>{totalValue > 0 ? "100.0%" : "—"}</TD>
            </TotalsFoot>
          </ReportTable>
        )}
      </Card>
    </div>
  );
}
