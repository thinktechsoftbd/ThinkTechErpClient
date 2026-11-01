import type { Metadata } from "next";
import Link from "next/link";
import { Coins, Percent, Receipt, Wallet } from "lucide-react";
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
  periodText,
} from "@/modules/inventory/components/reports/report-parts";
import { purchaseApi } from "@/modules/purchase/api";
import { supplierOptions } from "@/modules/purchase/components/reports/report-helpers";
import { getSupplierOptions } from "@/modules/purchase/queries";

export const metadata: Metadata = { title: "Purchase Register" };

const basePath = "/purchase/reports/register";
type Props = PageProps<"/purchase/reports/register">;

const TYPE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Credit", label: "Credit" },
];

export default function PurchaseRegisterPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Purchase Register"
        description="Posted purchase invoices with their discount, tax, total and what is still due."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Purchase Register" }]}
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
  const supplierId = idParam(query.supplier);
  const typeParam = firstParam(query.type);
  const purchaseType = TYPE_OPTIONS.some((option) => option.value === typeParam) ? typeParam : undefined;
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [suppliers, result] = await Promise.all([
    getSupplierOptions(),
    tryApi(() => purchaseApi.reports.register({ search, supplierId, purchaseType, from, to, limit: REPORT_PAGE_SIZE, offset })),
  ]);
  const supplierList = supplierOptions(suppliers);
  const filters = { q: search, supplier: supplierId, type: purchaseType, from, to };
  const filtered = Object.values(filters).some((value) => value !== undefined);
  const totals: Partial<Record<string, number>> = result.ok ? result.data.totals : {};
  const showCharges = result.ok && result.data.items.some((row) => row.chargeAmount !== 0);

  return (
    <div className="space-y-6">
      <ReportFilters basePath={basePath} query={filters}>
        <ReportSearch value={search} placeholder="Invoice, bill or VAT no" />
        <ReportSelect name="supplier" label="Supplier" value={supplierId} options={supplierList} allLabel="All suppliers" className="w-56" />
        <ReportSelect name="type" label="Type" value={purchaseType} options={TYPE_OPTIONS} allLabel="Cash & credit" className="w-36" />
        <ReportDate name="from" label="From" value={from} />
        <ReportDate name="to" label="To" value={to} />
      </ReportFilters>

      {result.ok && (
        <ReportSummary
          items={[
            { label: "Invoices", value: formatNumber(result.data.totalCount), icon: Receipt },
            { label: "Total purchases", value: formatAmount(totals.total), icon: Coins, hint: `Discount ${formatAmount(totals.discount)}` },
            { label: "Tax", value: formatAmount(totals.tax), icon: Percent },
            { label: "Still due", value: formatAmount(totals.due), icon: Wallet },
          ]}
        />
      )}

      <Card>
        <CardHeader
          title="Posted invoices"
          description={criteriaText(
            optionLabel(supplierList, supplierId) ?? "All suppliers",
            purchaseType && `${purchaseType} purchases`,
            periodText(from, to),
            search && `“${search}”`,
          )}
        />
        {!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filtered ? "No invoices match these filters" : "No posted purchases yet"}
            description={filtered ? undefined : "Invoices show here once they are posted."}
          />
        ) : (
          <>
            <ReportTable>
              <THead>
                <tr>
                  <TH>Invoice</TH>
                  <TH>Date</TH>
                  <TH>Supplier</TH>
                  <TH>Type</TH>
                  <TH className="text-right">Subtotal</TH>
                  <TH className="text-right">Discount</TH>
                  <TH className="text-right">Tax</TH>
                  {showCharges && <TH className="text-right">Charges</TH>}
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Due</TH>
                  <TH>Payment</TH>
                </tr>
              </THead>
              <TBody>
                {result.data.items.map((row) => (
                  <TR key={row.invoiceId}>
                    <TD>
                      <Link
                        href={`/purchase/invoices/${row.invoiceId}`}
                        className="font-medium whitespace-nowrap text-brand-500 hover:underline print:text-inherit print:no-underline"
                      >
                        {row.invoiceNo}
                      </Link>
                      {(row.supplierInvoiceNo || row.taxInvoiceNo) && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {[row.supplierInvoiceNo && `Bill ${row.supplierInvoiceNo}`, row.taxInvoiceNo && `VAT ${row.taxInvoiceNo}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap">{formatDate(row.invoiceDate)}</TD>
                    <TD>{row.supplierName ?? "Walk-in supplier"}</TD>
                    <TD>
                      <DocumentStatusBadge status={row.purchaseType} />
                    </TD>
                    <TD className={NUM}>{formatAmount(row.subtotalAmount)}</TD>
                    <TD className={NUM}>{row.discountAmount ? formatAmount(row.discountAmount) : "—"}</TD>
                    <TD className={NUM}>{row.taxAmount ? formatAmount(row.taxAmount) : "—"}</TD>
                    {showCharges && <TD className={NUM}>{row.chargeAmount ? formatAmount(row.chargeAmount) : "—"}</TD>}
                    <TD className={`${NUM} font-medium text-gray-800 dark:text-white/90`}>
                      {formatAmount(row.totalAmount)}
                      {row.currency && <span className="ml-1 text-xs font-normal text-gray-500">{row.currency}</span>}
                    </TD>
                    <TD className={NUM}>{row.dueAmount > 0 ? formatAmount(row.dueAmount) : "—"}</TD>
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
                <TD className={NUM}>{formatAmount(totals.subtotal)}</TD>
                <TD className={NUM}>{formatAmount(totals.discount)}</TD>
                <TD className={NUM}>{formatAmount(totals.tax)}</TD>
                {showCharges && <TD className={NUM} />}
                <TD className={NUM}>{formatAmount(totals.total)}</TD>
                <TD className={NUM}>{formatAmount(totals.due)}</TD>
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
