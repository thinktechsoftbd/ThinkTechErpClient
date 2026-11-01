import type { Metadata } from "next";
import { CalendarClock, CalendarX, Coins, Hourglass } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref, firstParam, parseOffset } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatDate, formatNumber } from "@/core/utils/format";
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
  criteriaText,
  idParam,
  optionLabel,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions, getInventorySettings } from "@/modules/inventory/queries";

export const metadata: Metadata = { title: "Expiry Alert" };

const basePath = "/inventory/reports/expiry";
type Props = PageProps<"/inventory/reports/expiry">;

const DAY_CHOICES = [30, 60, 90, 180, 365];

/** `?days=` as a whole number of days (1–3650); anything else falls back to the alert setting. */
function parseDays(value: string | string[] | undefined) {
  const days = Number(firstParam(value));
  return Number.isInteger(days) && days > 0 && days <= 3650 ? days : undefined;
}

function daysLeftBadge(daysLeft: number, nearDays: number) {
  if (daysLeft < 0) {
    const ago = -daysLeft;
    return <Badge tone="error">Expired {ago === 1 ? "1 day" : `${formatNumber(ago)} days`} ago</Badge>;
  }
  if (daysLeft === 0) return <Badge tone="error">Expires today</Badge>;
  return (
    <Badge tone={daysLeft <= nearDays ? "warning" : "gray"}>{daysLeft === 1 ? "1 day" : `${formatNumber(daysLeft)} days`}</Badge>
  );
}

export default function ExpiryPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Expiry Alert"
        description="Batches in stock that expire soon, and those already expired. Values are at cost in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Expiry Alert" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={3} columns={7} />}>
        <ExpiryReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExpiryReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const withinDays = parseDays(query.days);
  const warehouseId = idParam(query.warehouse);
  const search = firstParam(query.q);
  const offset = parseOffset(query.offset);

  const [options, settings, result] = await Promise.all([
    getInventoryOptions(),
    getInventorySettings(),
    tryApi(() => inventoryApi.reports.expiry({ withinDays, warehouseId, search, limit: REPORT_PAGE_SIZE, offset })),
  ]);
  const warehouses = warehouseOptions(options);
  const alertDays = settings.ok ? settings.data.expiryAlertDays : undefined;
  // Amber for batches inside the organization's alert window; red once expired.
  const nearDays = alertDays ?? 30;
  const dayOptions = [...new Set([...DAY_CHOICES, ...(withinDays ? [withinDays] : [])])]
    .sort((a, b) => a - b)
    .map((days) => ({ value: String(days), label: `Within ${formatNumber(days)} days` }));
  const filters = { days: withinDays, warehouse: warehouseId, q: search };
  const filtered = Boolean(warehouseId || search);
  const windowDays = withinDays ?? alertDays;

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSelect
          name="days"
          label="Expiring"
          value={withinDays}
          options={dayOptions}
          allLabel={alertDays ? `Alert setting (${formatNumber(alertDays)} days)` : "Alert setting"}
        />
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouses} allLabel="All warehouses" />
        <ReportSearch value={search} placeholder="Product or batch" />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Batches", value: formatNumber(result.data.totalCount), icon: CalendarClock },
            { label: "Stock value", value: formatAmount(result.data.totals.stockValue), icon: Coins, hint: "Of the batches listed" },
            { label: "Already expired", value: formatAmount(result.data.totals.expiredValue), icon: CalendarX, hint: "Value past its expiry date" },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Expiring batches"
          description={criteriaText(
            windowDays ? `Expiring within ${formatNumber(windowDays)} days, expired included` : "Expiring soon, expired included",
            optionLabel(warehouses, warehouseId) ?? "All warehouses",
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={Hourglass}
            title={filtered ? "No batches match these filters" : "Nothing expiring"}
            description={filtered ? undefined : "No batch in stock expires within this window. Try a longer one."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH>Warehouse</TH>
                  <TH>Batch</TH>
                  <TH>Expiry date</TH>
                  <TH>Days left</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-right">Value</TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => {
                  const expired = row.daysLeft < 0;
                  const near = !expired && row.daysLeft <= nearDays;
                  return (
                    <TR
                      key={`${row.batchId}-${row.warehouseId}`}
                      className={cn(
                        "[print-color-adjust:exact]",
                        expired && "bg-red-50/70 hover:bg-red-50 dark:bg-red-500/[0.06] dark:hover:bg-red-500/10",
                        near && "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-500/[0.05] dark:hover:bg-amber-500/10",
                      )}
                    >
                      <TD>
                        <ProductCell
                          name={row.productName}
                          code={row.productCode}
                          href={buildHref("/inventory/reports/stock-card", { product: row.productId, warehouse: row.warehouseId })}
                        />
                      </TD>
                      <TD className="whitespace-nowrap">{row.warehouseName}</TD>
                      <TD className="font-medium whitespace-nowrap">{row.batchNo}</TD>
                      <TD
                        className={cn(
                          "whitespace-nowrap",
                          expired && "font-medium text-red-700 dark:text-red-400",
                          near && "text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {formatDate(row.expiryDate)}
                      </TD>
                      <TD>{daysLeftBadge(row.daysLeft, nearDays)}</TD>
                      <TD className={NUM}>
                        {formatQuantity(row.quantity)} <span className="text-xs text-gray-500">{row.baseUnitCode}</span>
                      </TD>
                      <TD className={`${NUM} font-medium`}>{formatAmount(row.stockValue)}</TD>
                    </TR>
                  );
                })}
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
