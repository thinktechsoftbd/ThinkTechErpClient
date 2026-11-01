import type { Metadata } from "next";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, History, PackageSearch } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { buildHref } from "@/core/ui/pagination";
import { TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import { DocumentLink } from "@/modules/inventory/components/reports/document-link";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";
import { ReportProductPicker } from "@/modules/inventory/components/reports/product-picker";
import { ReportDate, ReportField, ReportFilters, ReportSelect } from "@/modules/inventory/components/reports/report-filters";
import {
  NUM,
  ReportSkeleton,
  ReportSummary,
  ReportTable,
  TotalsFoot,
  criteriaText,
  dateParam,
  idParam,
  periodText,
  warehouseOptions,
} from "@/modules/inventory/components/reports/report-parts";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { label, type StockCard } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Stock Card" };

const basePath = "/inventory/reports/stock-card";
type Props = PageProps<"/inventory/reports/stock-card">;

export default function StockCardPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Stock Card"
        description="Every movement of one product over a period, with the running balance. Values are in the base currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Stock Card" }]}
        actions={<PrintButton />}
      />
      <Suspense fallback={<ReportSkeleton stats={4} columns={9} />}>
        <StockCardReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function StockCardReport({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const productId = idParam(query.product);
  const warehouseId = idParam(query.warehouse);
  const from = dateParam(query.from);
  const to = dateParam(query.to);

  const [options, result] = await Promise.all([
    getInventoryOptions(),
    productId ? tryApi(() => inventoryApi.reports.stockCard({ productId, warehouseId, from, to })) : Promise.resolve(null),
  ]);
  const card = result?.ok ? result.data : null;

  return (
    <div className="space-y-6">
      <ReportFilters
        basePath={basePath}
        query={{ product: productId, warehouse: warehouseId, from, to }}
        hidden={{ product: productId }}
        filtered={Boolean(warehouseId || from || to)}
        clearHref={buildHref(basePath, { product: productId })}
      >
        <ReportField label={card ? `Product: ${card.productCode}` : "Product"} className="w-full sm:w-80" group>
          <ReportProductPicker
            basePath={basePath}
            placeholder={card ? `${card.productName} (change)` : "Search product by name, code or barcode"}
          />
        </ReportField>
        <ReportSelect name="warehouse" label="Warehouse" value={warehouseId} options={warehouseOptions(options)} allLabel="All warehouses" />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result === null ? (
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Pick a product"
            description="Search for a product by name, code or barcode to see its movements and running balance. The period defaults to this month."
          />
        </Card>
      ) : !result.ok ? (
        <Card>
          <ApiErrorState error={result.error} notFoundHint="That product isn't in this organization." />
        </Card>
      ) : (
        <StockCardView card={result.data} showWarehouse={!warehouseId} />
      )}
    </div>
  );
}

function StockCardView({ card, showWarehouse }: { card: StockCard; showWarehouse: boolean }) {
  const unit = card.baseUnitCode;
  const leading = showWarehouse ? 5 : 4;

  return (
    <>
      <ReportSummary
        items={[
          { label: "Opening", value: `${formatQuantity(card.openingQuantity)} ${unit}`, icon: History, hint: `Value ${formatAmount(card.openingValue)}` },
          { label: "In", value: `${formatQuantity(card.quantityIn)} ${unit}`, icon: ArrowDownToLine },
          { label: "Out", value: `${formatQuantity(card.quantityOut)} ${unit}`, icon: ArrowUpFromLine },
          { label: "Closing", value: `${formatQuantity(card.closingQuantity)} ${unit}`, icon: Boxes, hint: `Value ${formatAmount(card.closingValue)}` },
        ]}
      />

      <Card>
        <CardHeader
          title={`${card.productName} (${card.productCode})`}
          description={criteriaText(card.warehouseName ?? "All warehouses", periodText(card.from, card.to), `Quantities in ${unit}`)}
        />
        <ReportTable>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Document</TH>
              {showWarehouse && <TH>Warehouse</TH>}
              <TH>Batch</TH>
              <TH className="text-right">In</TH>
              <TH className="text-right">Out</TH>
              <TH className="text-right">Unit cost</TH>
              <TH className="text-right">Value</TH>
              <TH className="text-right">Balance</TH>
            </tr>
          </THead>
          <TBody>
            <TR className="bg-gray-50/60 dark:bg-white/[0.02]">
              <TD colSpan={leading} className="font-medium text-gray-800 dark:text-white/90">
                Opening balance <span className="font-normal text-gray-500">on {formatDate(card.from)}</span>
              </TD>
              <TD className={NUM} />
              <TD className={NUM} />
              <TD className={NUM} />
              <TD className={NUM}>{formatAmount(card.openingValue)}</TD>
              <TD className={`${NUM} font-medium`}>{formatQuantity(card.openingQuantity)}</TD>
            </TR>
            {card.entries.length === 0 ? (
              <tr>
                <TD colSpan={leading + 5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No movements in this period.
                </TD>
              </tr>
            ) : (
              card.entries.map((entry) => (
                <TR key={entry.movementId}>
                  <TD className="whitespace-nowrap">{formatDate(entry.movementDate)}</TD>
                  <TD className="whitespace-nowrap">{label(entry.movementType)}</TD>
                  <TD>
                    <DocumentLink
                      documentType={entry.documentType}
                      documentId={entry.documentId}
                      documentNo={entry.documentNo}
                      showType={false}
                    />
                  </TD>
                  {showWarehouse && <TD className="whitespace-nowrap">{entry.warehouseName}</TD>}
                  <TD>{entry.batchNo ?? "—"}</TD>
                  <TD className={`${NUM} text-green-700 dark:text-green-400`}>{entry.quantityIn ? formatQuantity(entry.quantityIn) : ""}</TD>
                  <TD className={`${NUM} text-red-600 dark:text-red-400`}>{entry.quantityOut ? formatQuantity(entry.quantityOut) : ""}</TD>
                  <TD className={NUM}>{formatAmount(entry.unitCost)}</TD>
                  <TD className={NUM}>{formatAmount(entry.value)}</TD>
                  <TD className={`${NUM} font-medium text-gray-800 dark:text-white/90`}>{formatQuantity(entry.balance)}</TD>
                </TR>
              ))
            )}
          </TBody>
          <TotalsFoot>
            <TD colSpan={leading}>
              Closing balance <span className="font-normal text-gray-500">on {formatDate(card.to)}</span>
            </TD>
            <TD className={NUM}>{formatQuantity(card.quantityIn)}</TD>
            <TD className={NUM}>{formatQuantity(card.quantityOut)}</TD>
            <TD className={NUM} />
            <TD className={NUM}>{formatAmount(card.closingValue)}</TD>
            <TD className={NUM}>
              {formatQuantity(card.closingQuantity)} <span className="text-xs font-normal text-gray-500">{unit}</span>
            </TD>
          </TotalsFoot>
        </ReportTable>
      </Card>
    </>
  );
}
