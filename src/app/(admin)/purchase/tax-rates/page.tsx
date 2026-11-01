import type { Metadata } from "next";
import { Percent } from "lucide-react";
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
import { saveTaxRateAction } from "@/modules/purchase/actions/setup";
import { purchaseApi } from "@/modules/purchase/api";
import { TaxRateFields, TaxRatesTable } from "@/modules/purchase/components/setup/tax-rates";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Tax Rates" };

const basePath = "/purchase/tax-rates";
type Props = PageProps<"/purchase/tax-rates">;

export default function TaxRatesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Tax Rates"
        description="Single taxes such as VAT 15% or SD 20%. Combine them into tax groups to use them on products and purchase lines."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Tax Rates" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New tax rate"
                title="New tax rate"
                action={saveTaxRateAction.bind(null, null)}
                submitLabel="Create"
              >
                <TaxRateFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <TaxRateList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function TaxRateList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => purchaseApi.taxRates.list({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} tax rate(s)` : "Tax rates"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Code or name" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Percent}
          title={filtered ? "No tax rates match these filters" : "No tax rates yet"}
          description={filtered ? undefined : "Add the taxes you pay on purchases, e.g. VAT 15%, with New tax rate."}
        />
      ) : (
        <>
          <TaxRatesTable rows={result.data.items} canManage={canManagePurchase(session)} />
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
