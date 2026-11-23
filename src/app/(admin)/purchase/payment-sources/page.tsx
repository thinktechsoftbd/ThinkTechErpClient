import type { Metadata } from "next";
import { WalletCards } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import type { SortDirection } from "@/core/crud/sort-header";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManagePurchase } from "@/modules/purchase/access";
import { savePaymentSourceAction } from "@/modules/purchase/actions/setup";
import { purchaseApi } from "@/modules/purchase/api";
import { PaymentSourceFields, PaymentSourcesTable } from "@/modules/purchase/components/setup/payment-sources";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Payment Sources" };

const basePath = "/purchase/payment-sources";
const PAGE_SIZE = 30;
const SORTS = ["name", "lines", "status", "updated"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/purchase/payment-sources">;

const modalDescription = "Each line names a kind of payment made from this source and the ledger head it posts to.";

export default function PaymentSourcesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Payment Sources"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Payment Sources" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New payment source"
                title="New payment source"
                description={modalDescription}
                action={savePaymentSourceAction.bind(null, null)}
                submitLabel="Create"
                size="lg"
              >
                <PaymentSourceFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <PaymentSourceList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (names or what a line is for; status), sorts and pages; 30 per page.
async function PaymentSourceList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => purchaseApi.paymentSources.list({ search, isActive, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;
  const active = isActive === undefined ? undefined : String(isActive);

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">
          {result.ok
            ? `${formatNumber(result.data.totalCount)} payment source${result.data.totalCount === 1 ? "" : "s"}`
            : "Payment sources"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Name or payment for"
          filters={[{ name: "active", label: "Status", value: activeParam, options: ACTIVE_FILTER_OPTIONS, allLabel: "All statuses" }]}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={WalletCards}
          title={filtered ? "No payment sources match these filters" : "No payment sources yet"}
          description={filtered ? undefined : "Add Cash, your banks and mobile wallets with New payment source."}
        />
      ) : (
        <>
          <PaymentSourcesTable
            rows={result.data.items}
            canManage={canManagePurchase(session)}
            sorting={{ sort: sort ?? "", direction, basePath, query: { q: search, active } }}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, active, sort, dir: direction === "asc" ? undefined : direction }}
            offset={offset}
            limit={PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
