import type { Metadata } from "next";
import { Truck } from "lucide-react";
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
const PAGE_SIZE = 30;
const SORTS = ["code", "name", "group", "ledger", "terms", "balance", "status", "updated"] as const;
type Sort = (typeof SORTS)[number];
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
        compact
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

// Server-side: the API filters (code, name, local name, mobile, phone or contact; group; status), sorts and pages;
// 30 per page.
async function SupplierList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const groupId = groupFilter(query.group);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, groups, currencies, result] = await Promise.all([
    requireSession(),
    getSupplierGroupOptions(),
    getCurrencyOptions(),
    tryApi(() => purchaseApi.suppliers.list({ search, isActive, groupId, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const groupList = groups.ok ? groups.data : [];
  const filtered = Boolean(search) || groupId !== undefined || isActive !== undefined;
  const filterQuery = {
    q: search,
    group: groupId === undefined ? undefined : String(groupId),
    active: isActive === undefined ? undefined : String(isActive),
  };

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} supplier${result.data.totalCount === 1 ? "" : "s"}` : "Suppliers"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Code, name, mobile"
          filters={[
            {
              name: "group",
              label: "Supplier group",
              value: filterQuery.group,
              options: groupList.map((group) => ({ value: String(group.id), label: group.name })),
              allLabel: "All groups",
              className: "w-44",
            },
            { name: "active", label: "Status", value: activeParam, options: ACTIVE_FILTER_OPTIONS, allLabel: "All statuses" },
          ]}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
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
            sorting={{ sort: sort ?? "", direction, basePath, query: filterQuery }}
          />
          <Pagination
            basePath={basePath}
            query={{ ...filterQuery, sort, dir: direction === "asc" ? undefined : direction }}
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
