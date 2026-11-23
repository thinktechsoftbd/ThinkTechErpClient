import type { Metadata } from "next";
import { Users } from "lucide-react";
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
import { canManageSales } from "@/modules/sales/access";
import { saveCustomerAction } from "@/modules/sales/actions/customers";
import { salesApi } from "@/modules/sales/api";
import { CustomerFields } from "@/modules/sales/components/customers/customer-fields";
import { CustomersTable } from "@/modules/sales/components/customers/customers-table";
import { getCustomerGroupOptions } from "@/modules/sales/queries";
import { SALES_MANAGE_PERMISSION } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Customers" };

const basePath = "/sales/customers";
const PAGE_SIZE = 30;
const SORTS = ["code", "name", "mobile", "group", "credit", "balance", "status", "updated"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/sales/customers">;

function groupFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

export default function CustomersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Customers"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sales", href: "/sales" }, { label: "Customers" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SALES_MANAGE_PERMISSION}>
              <NewCustomerButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <CustomerList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewCustomerButton() {
  const groups = await getCustomerGroupOptions();
  return (
    <FormModalButton
      mode="create"
      label="New customer"
      title="New customer"
      action={saveCustomerAction.bind(null, null)}
      submitLabel="Create"
      size="lg"
    >
      <CustomerFields groups={groups.ok ? groups.data : []} />
    </FormModalButton>
  );
}

// Server-side: the API filters (code, name, local name, mobile, phone or contact; group; status), sorts and pages;
// 30 per page.
async function CustomerList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const groupId = groupFilter(query.group);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, groups, result] = await Promise.all([
    requireSession(),
    getCustomerGroupOptions(),
    tryApi(() => salesApi.customers.list({ search, isActive, groupId, sort, direction, limit: PAGE_SIZE, offset })),
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
          {result.ok ? `${formatNumber(result.data.totalCount)} customer${result.data.totalCount === 1 ? "" : "s"}` : "Customers"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Code, name, mobile"
          filters={[
            {
              name: "group",
              label: "Customer group",
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
          icon={Users}
          title={filtered ? "No customers match these filters" : "No customers yet"}
          description={filtered ? undefined : "Add the people and businesses you sell to on credit with New customer."}
        />
      ) : (
        <>
          <CustomersTable
            rows={result.data.items}
            groups={groupList}
            canManage={canManageSales(session)}
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
