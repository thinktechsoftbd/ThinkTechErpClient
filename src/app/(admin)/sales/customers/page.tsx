import type { Metadata } from "next";
import { Users } from "lucide-react";
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
import { canManageSales } from "@/modules/sales/access";
import { saveCustomerAction } from "@/modules/sales/actions/customers";
import { salesApi } from "@/modules/sales/api";
import { CustomerFields } from "@/modules/sales/components/customers/customer-fields";
import { CustomersTable } from "@/modules/sales/components/customers/customers-table";
import { getCustomerGroupOptions } from "@/modules/sales/queries";
import { SALES_MANAGE_PERMISSION } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Customers" };

const basePath = "/sales/customers";
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
        description="Who you sell to: contacts, NID and BIN, payment terms, credit limits, opening balances and what each one owes."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Customers" }]}
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

async function CustomerList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const groupId = groupFilter(query.group);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, groups, result] = await Promise.all([
    requireSession(),
    getCustomerGroupOptions(),
    tryApi(() => salesApi.customers.list({ search, isActive, groupId, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const groupList = groups.ok ? groups.data : [];
  const filtered = Boolean(search) || groupId !== undefined || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} customer(s)` : "Customers"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Code, name, mobile" filtered={filtered}>
            <FilterSelect
              name="group"
              label="Customer group"
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
          icon={Users}
          title={filtered ? "No customers match these filters" : "No customers yet"}
          description={filtered ? undefined : "Add the people and businesses you sell to on credit with New customer."}
        />
      ) : (
        <>
          <CustomersTable rows={result.data.items} groups={groupList} canManage={canManageSales(session)} />
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
