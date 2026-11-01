import type { Metadata } from "next";
import { Layers } from "lucide-react";
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
import { saveTaxGroupAction } from "@/modules/purchase/actions/setup";
import { purchaseApi } from "@/modules/purchase/api";
import { TaxGroupFields, TaxGroupsTable } from "@/modules/purchase/components/setup/tax-groups";
import { getAllTaxRates } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Tax Groups" };

const basePath = "/purchase/tax-groups";
type Props = PageProps<"/purchase/tax-groups">;

const modalDescription = "A compound rate applies on the amount plus the taxes above it (e.g. SD first, then VAT compound).";

export default function TaxGroupsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Tax Groups"
        description="The taxes charged together on a product or purchase line, in order. A group without rates is Exempt."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Tax Groups" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <NewTaxGroupButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={5} />}>
          <TaxGroupList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewTaxGroupButton() {
  const taxRates = await getAllTaxRates();
  return (
    <FormModalButton
      mode="create"
      label="New tax group"
      title="New tax group"
      description={modalDescription}
      action={saveTaxGroupAction.bind(null, null)}
      submitLabel="Create"
    >
      <TaxGroupFields taxRates={taxRates.ok ? taxRates.data : []} />
    </FormModalButton>
  );
}

async function TaxGroupList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, taxRates, result] = await Promise.all([
    requireSession(),
    getAllTaxRates(),
    tryApi(() => purchaseApi.taxGroups.list({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} tax group(s)` : "Tax groups"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search tax groups" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={filtered ? "No tax groups match these filters" : "No tax groups yet"}
          description={filtered ? undefined : "Combine tax rates (e.g. SD 20% then VAT 15% compound) with New tax group."}
        />
      ) : (
        <>
          <TaxGroupsTable
            rows={result.data.items}
            taxRates={taxRates.ok ? taxRates.data : []}
            canManage={canManagePurchase(session)}
          />
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
