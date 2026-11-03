import type { Metadata } from "next";
import { WalletCards } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import {
  ACTIVE_FILTER_OPTIONS,
  CRUD_PAGE_SIZE,
  FilterSelect,
  ListToolbar,
  parseActiveFilter,
} from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
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
type Props = PageProps<"/purchase/payment-sources">;

const modalDescription = "Each line names a kind of payment made from this source and the ledger head it posts to.";

export default function PaymentSourcesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Payment Sources"
        description="Where money is paid from or received into, with the ledger head each kind of payment posts to. Shared by every organization."
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

async function PaymentSourceList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => purchaseApi.paymentSources.list({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} payment source(s)` : "Payment sources"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search names or payment for" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={WalletCards}
          title={filtered ? "No payment sources match these filters" : "No payment sources yet"}
          description={filtered ? undefined : "Add Cash, your banks and mobile wallets with New payment source."}
        />
      ) : (
        <>
          <PaymentSourcesTable rows={result.data.items} canManage={canManagePurchase(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, active: isActive === undefined ? undefined : String(isActive) }}
            offset={offset}
            limit={CRUD_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
