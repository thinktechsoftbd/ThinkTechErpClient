import type { Metadata } from "next";
import { Truck } from "lucide-react";
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
import { parseIdParam } from "@/core/utils/params";
import { getCurrencyOptions } from "@/modules/inventory/queries";
import { canManagePurchase } from "@/modules/purchase/access";
import { saveSupplierAction } from "@/modules/purchase/actions/setup";
import { purchaseApi } from "@/modules/purchase/api";
import { SupplierFields } from "@/modules/purchase/components/setup/supplier-fields";
import { SuppliersTable } from "@/modules/purchase/components/setup/suppliers-table";
import { getSupplierGroupOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Suppliers" };

const basePath = "/purchase/suppliers";
type Props = PageProps<"/purchase/suppliers">;

function groupFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

export default function SuppliersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy from: contacts, tax and licence numbers, payment terms, opening balances and bank details."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Suppliers" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <NewSupplierButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <SupplierList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewSupplierButton() {
  const [groups, currencies] = await Promise.all([getSupplierGroupOptions(), getCurrencyOptions()]);
  return (
    <FormModalButton
      mode="create"
      label="New supplier"
      title="New supplier"
      action={saveSupplierAction.bind(null, null)}
      submitLabel="Create"
      size="lg"
    >
      <SupplierFields groups={groups.ok ? groups.data : []} currencies={currencies.ok ? currencies.data : []} />
    </FormModalButton>
  );
}

async function SupplierList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const groupId = groupFilter(query.group);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, groups, currencies, result] = await Promise.all([
    requireSession(),
    getSupplierGroupOptions(),
    getCurrencyOptions(),
    tryApi(() => purchaseApi.suppliers.list({ search, isActive, groupId, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const groupList = groups.ok ? groups.data : [];
  const filtered = Boolean(search) || groupId !== undefined || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} supplier(s)` : "Suppliers"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Code, name, mobile" filtered={filtered}>
            <FilterSelect
              name="group"
              label="Supplier group"
              value={groupId ? String(groupId) : undefined}
              options={groupList.map((group) => ({ value: String(group.id), label: group.name }))}
              allLabel="All groups"
              className="w-44"
            />
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={filtered ? "No suppliers match these filters" : "No suppliers yet"}
          description={filtered ? undefined : "Add the people and companies you buy from with New supplier."}
        />
      ) : (
        <>
          <SuppliersTable
            rows={result.data.items}
            groups={groupList}
            currencies={currencies.ok ? currencies.data : []}
            canManage={canManagePurchase(session)}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, group: groupId, active: isActive === undefined ? undefined : String(isActive) }}
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
