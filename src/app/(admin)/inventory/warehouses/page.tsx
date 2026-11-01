import type { Metadata } from "next";
import Link from "next/link";
import { Warehouse } from "lucide-react";
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
import { saveWarehouseAction } from "@/modules/inventory/actions/setup";
import { inventoryApi } from "@/modules/inventory/api";
import { WarehouseFields } from "@/modules/inventory/components/setup/fields";
import { WarehousesTable } from "@/modules/inventory/components/setup/tables";
import { getInventorySettings } from "@/modules/inventory/queries";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Warehouses" };

const basePath = "/inventory/warehouses";
type Props = PageProps<"/inventory/warehouses">;

export default function WarehousesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Warehouses"
        description={
          <>
            Places that hold stock: a store (shop or outlet) or a warehouse (godown). Choose the default one in{" "}
            <Link href="/inventory/settings" className="text-brand-500 hover:underline">
              Inventory Settings
            </Link>
            .
          </>
        }
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Warehouses" }]}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New warehouse"
                title="New warehouse"
                action={saveWarehouseAction.bind(null, null)}
                submitLabel="Create"
              >
                <WarehouseFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <WarehouseList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function WarehouseList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, settings, result] = await Promise.all([
    requireSession(),
    getInventorySettings(),
    tryApi(() => inventoryApi.warehouses.list({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} warehouse(s)` : "Warehouses"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search warehouses" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={filtered ? "No warehouses match these filters" : "No warehouses yet"}
          description={filtered ? undefined : "Add your shop and godown with New warehouse before entering stock."}
        />
      ) : (
        <>
          <WarehousesTable
            rows={result.data.items}
            currency={settings.ok ? settings.data.baseCurrency : null}
            canManage={canManageInventory(session)}
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
