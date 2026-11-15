import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, FilterSelect, ListToolbar, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageShippingZones } from "@/modules/settings/access";
import { saveShippingZoneAction } from "@/modules/settings/actions";
import { settingsApi } from "@/modules/settings/api";
import { ShippingZoneFields } from "@/modules/settings/components/shipping-zone-fields";
import { ShippingZonesTable } from "@/modules/settings/components/shipping-zone-tables";
import { LOCATION_PAGE_SIZE, SHIPPING_ZONE_MANAGE_PERMISSION } from "@/modules/settings/types";

export const metadata: Metadata = { title: "Shipping Zones" };

const basePath = "/settings/shipping-zones";
type Props = PageProps<"/settings/shipping-zones">;

export default function ShippingZonesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Shipping Zones"
        description="Delivery zones such as Inside Dhaka or Outside Dhaka, with their delivery days. Districts and areas point to one."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "Shipping Zones" },
        ]}
        actions={
          <Suspense>
            <PermissionOnly code={SHIPPING_ZONE_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New shipping zone"
                title="New shipping zone"
                action={saveShippingZoneAction.bind(null, null)}
                submitLabel="Create"
              >
                <ShippingZoneFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <ShippingZonesList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ShippingZonesList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => settingsApi.listShippingZones({ search, isActive, limit: LOCATION_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} shipping zone(s)` : "Shipping zones"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search by code or name" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={filtered ? "No shipping zones match these filters" : "No shipping zones yet"}
          description={filtered ? undefined : "Add one with New shipping zone."}
        />
      ) : (
        <>
          <ShippingZonesTable rows={result.data.items} canManage={canManageShippingZones(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, active: isActive === undefined ? undefined : String(isActive) }}
            offset={offset}
            limit={LOCATION_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
