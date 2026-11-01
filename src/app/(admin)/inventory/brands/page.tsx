import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, CRUD_PAGE_SIZE, FilterSelect, ListToolbar, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageInventory } from "@/modules/inventory/access";
import { saveBrandAction } from "@/modules/inventory/actions/setup";
import { inventoryApi } from "@/modules/inventory/api";
import { BrandFields } from "@/modules/inventory/components/setup/fields";
import { BrandsTable } from "@/modules/inventory/components/setup/tables";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Brands" };

const basePath = "/inventory/brands";
type Props = PageProps<"/inventory/brands">;

export default function BrandsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Brands"
        description="Makers and labels of the products you sell."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Brands" }]}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <FormModalButton mode="create" label="New brand" title="New brand" action={saveBrandAction.bind(null, null)} submitLabel="Create">
                <BrandFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <BrandList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function BrandList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => inventoryApi.brands.list({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} brand(s)` : "Brands"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search brands" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={filtered ? "No brands match these filters" : "No brands yet"}
          description={filtered ? undefined : "Add brands with New brand."}
        />
      ) : (
        <>
          <BrandsTable rows={result.data.items} canManage={canManageInventory(session)} />
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
