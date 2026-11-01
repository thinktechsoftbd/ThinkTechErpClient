import type { Metadata } from "next";
import { Coins, PackageX, Plus, ShoppingCart } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref, firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportFilters, ReportSearch, ReportSelect } from "@/modules/inventory/components/reports/report-filters";
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
  idParam,
  optionLabel,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Reorder Alert" };

const basePath = "/inventory/reports/reorder";
type Props = PageProps<"/inventory/reports/reorder">;

export default function ReorderPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Reorder Alert"
        description="Products at or below their reorder level, with the quantity to order to bring them back up."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Reorder Alert" }]}
        actions={
          <>
            <PrintButton />
            <Suspense>
              <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
                <LinkButton href="/purchase/orders/new" size="sm" className="print:hidden">
                  <Plus className="size-4" aria-hidden /> Create purchase order
                </LinkButton>
              </PermissionOnly>
            </Suspense>
          </>
        }
      />
      <Suspense fallback={<ReportSkeleton stats={2} columns={8} />}>
        <ReorderReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ReorderReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const warehouseId = idParam(query.warehouse);
  const categoryId = idParam(query.category);
  const offset = parseOffset(query.offset);

  const [options, result] = await Promise.all([
    getInventoryOptions(),
    tryApi(() => inventoryApi.reports.reorder({ search, warehouseId, categoryId, limit: REPORT_PAGE_SIZE, offset })),
  ]);
  const warehouses = warehouseOptions(options);
  const categories = categoryOptions(options);
  const filters = { q: search, warehouse: warehouseId, category: categoryId };
  const filtered = Boolean(search || warehouseId || categoryId);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSearch value={search} placeholder="Product name or code" />
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouses} allLabel="All warehouses" />
        <ReportSelect name="category" label="Category" value={categoryId} options={categories} allLabel="All categories" className="w-56" />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Products to reorder", value: formatNumber(result.data.totalCount), icon: ShoppingCart },
            {
              label: "Estimated cost",
              value: formatAmount(result.data.totals.estimatedCost),
              icon: Coins,
              hint: "Suggested quantities at the last purchase cost",
            },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Products to reorder"
          description={criteriaText(
            optionLabel(warehouses, warehouseId) ?? "All warehouses",
            optionLabel(categories, categoryId),
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title={filtered ? "Nothing to reorder for these filters" : "Nothing to reorder"}
            description={filtered ? undefined : "Every product with a reorder level is above it. Set reorder levels on the products to get alerts."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH>Category</TH>
                  <TH className="text-right">On hand</TH>
                  <TH className="text-right">Reorder level</TH>
                  <TH className="text-right">Reorder qty</TH>
                  <TH className="text-right">Suggested</TH>
                  <TH className="text-right">Last cost</TH>
                  <TH className="text-right">Est. cost</TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => (
                  <TR key={row.productId}>
                    <TD>
                      <ProductCell
                        name={row.productName}
                        code={row.productCode}
                        href={buildHref("/inventory/reports/stock-card", { product: row.productId, warehouse: warehouseId })}
                      />
                    </TD>
                    <TD>{row.categoryName ?? "—"}</TD>
                    <TD className={NUM}>
                      {row.quantity <= 0 ? (
                        <Badge tone="error">Out of stock</Badge>
                      ) : (
                        <span className="font-medium text-amber-700 dark:text-amber-400">{formatQuantity(row.quantity)}</span>
                      )}{" "}
                      <span className="text-xs text-gray-500">{row.baseUnitCode}</span>
                    </TD>
                    <TD className={NUM}>{formatQuantity(row.reorderLevel)}</TD>
                    <TD className={NUM}>{row.reorderQuantity > 0 ? formatQuantity(row.reorderQuantity) : "—"}</TD>
                    <TD className={`${NUM} font-medium text-gray-800 dark:text-white/90`}>
                      {formatQuantity(row.suggestedQuantity)} <span className="text-xs font-normal text-gray-500">{row.baseUnitCode}</span>
                    </TD>
                    <TD className={NUM}>{row.lastPurchaseCost > 0 ? formatAmount(row.lastPurchaseCost) : "—"}</TD>
                    <TD className={NUM}>{row.lastPurchaseCost > 0 ? formatAmount(row.suggestedQuantity * row.lastPurchaseCost) : "—"}</TD>
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
