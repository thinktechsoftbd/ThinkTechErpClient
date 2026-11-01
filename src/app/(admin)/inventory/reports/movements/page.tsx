import type { Metadata } from "next";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Coins } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref, firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import { DocumentLink } from "@/modules/inventory/components/reports/document-link";
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
  criteriaText,
  dateParam,
  idParam,
  optionLabel,
  periodText,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { MOVEMENT_TYPES, label } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Stock Movements" };

const basePath = "/inventory/reports/movements";
type Props = PageProps<"/inventory/reports/movements">;

const TYPE_OPTIONS = MOVEMENT_TYPES.map((type) => ({ value: type, label: label(type) }));

export default function MovementsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Stock Movements"
        description="Every stock in and out: receipts, returns, transfers, adjustments and cancellations. Values are in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Stock Movements" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={4} columns={9} />}>
        <MovementsReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MovementsReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const warehouseId = idParam(query.warehouse);
  const productId = idParam(query.product);
  const typeParam = firstParam(query.type);
  const movementType = TYPE_OPTIONS.some((option) => option.value === typeParam) ? typeParam : undefined;
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [options, result] = await Promise.all([
    getInventoryOptions(),
    tryApi(() =>
      inventoryApi.reports.movements({ search, warehouseId, productId, movementType, from, to, limit: REPORT_PAGE_SIZE, offset }),
    ),
  ]);
  const warehouses = warehouseOptions(options);
  const filters = { q: search, warehouse: warehouseId, product: productId, type: movementType, from, to };
  const filtered = Object.values(filters).some((value) => value !== undefined);
  const productName =
    productId && result.ok ? (result.data.items.find((row) => row.productId === productId)?.productName ?? `Product #${productId}`) : undefined;

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters} hidden={{ product: productId }}>
        <ReportSearch value={search} placeholder="Product, document or batch" />
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouses} allLabel="All warehouses" />
        <ReportSelect name="type" label="Movement" value={movementType} options={TYPE_OPTIONS} allLabel="All movements" />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Movements", value: formatNumber(result.data.totalCount), icon: ArrowLeftRight },
            { label: "Quantity in", value: formatQuantity(result.data.totals.quantityIn), icon: ArrowDownToLine, hint: "In each product's base unit" },
            { label: "Quantity out", value: formatQuantity(result.data.totals.quantityOut), icon: ArrowUpFromLine, hint: "In each product's base unit" },
            { label: "Net value", value: formatAmount(result.data.totals.value), icon: Coins, hint: "In less out, at cost" },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Movements"
          description={criteriaText(
            productName,
            optionLabel(warehouses, warehouseId) ?? "All warehouses",
            movementType && label(movementType),
            periodText(from, to),
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={filtered ? "No movements match these filters" : "No stock movements yet"}
            description={filtered ? undefined : "Movements are recorded when stock documents and purchases are posted."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Date</TH>
                  <TH>Movement</TH>
                  <TH>Product</TH>
                  <TH>Warehouse</TH>
                  <TH className="text-right">In</TH>
                  <TH className="text-right">Out</TH>
                  <TH className="text-right">Unit cost</TH>
                  <TH className="text-right">Value</TH>
                  <TH>Document</TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => (
                  <TR key={row.id}>
                    <TD className="whitespace-nowrap">{formatDate(row.movementDate)}</TD>
                    <TD className="whitespace-nowrap">
                      {label(row.movementType)}
                      {row.isReversal && (
                        <span className="ml-2">
                          <Badge tone="error">Reversal</Badge>
                        </span>
                      )}
                    </TD>
                    <TD>
                      <ProductCell
                        name={row.productName}
                        code={row.productCode}
                        href={buildHref("/inventory/reports/stock-card", { product: row.productId })}
                        detail={row.batchNo && ` · batch ${row.batchNo}`}
                      />
                    </TD>
                    <TD className="whitespace-nowrap">{row.warehouseName}</TD>
                    <TD className={`${NUM} text-green-700 dark:text-green-400`}>
                      {row.quantity > 0 && (
                        <>
                          {formatQuantity(row.quantity)} <span className="text-xs text-gray-500">{row.baseUnitCode}</span>
                        </>
                      )}
                    </TD>
                    <TD className={`${NUM} text-red-600 dark:text-red-400`}>
                      {row.quantity < 0 && (
                        <>
                          {formatQuantity(-row.quantity)} <span className="text-xs text-gray-500">{row.baseUnitCode}</span>
                        </>
                      )}
                    </TD>
                    <TD className={NUM}>{formatAmount(row.unitCost)}</TD>
                    <TD className={`${NUM} font-medium`}>{formatAmount(row.totalCost)}</TD>
                    <TD>
                      <DocumentLink documentType={row.documentType} documentId={row.documentId} documentNo={row.documentNo} />
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
