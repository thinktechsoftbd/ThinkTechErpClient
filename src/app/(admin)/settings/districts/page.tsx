import type { Metadata } from "next";
import { MapPinned } from "lucide-react";
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
import { parseIdParam } from "@/core/utils/params";
import { canManageDistricts } from "@/modules/settings/access";
import { saveDistrictAction } from "@/modules/settings/actions";
import { settingsApi } from "@/modules/settings/api";
import { DistrictFields } from "@/modules/settings/components/district-fields";
import { DistrictsTable } from "@/modules/settings/components/district-tables";
import { getDistrictDivisionOptions, getDistrictZoneOptions } from "@/modules/settings/queries";
import { DISTRICT_MANAGE_PERMISSION, LOCATION_PAGE_SIZE } from "@/modules/settings/types";

export const metadata: Metadata = { title: "Districts" };

const basePath = "/settings/districts";
type Props = PageProps<"/settings/districts">;

function idFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

export default function DistrictsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Districts"
        description="The districts of each division, with their Bangla name and the shipping zone their areas use."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings" }, { label: "Districts" }]}
        actions={
          <Suspense>
            <PermissionOnly code={DISTRICT_MANAGE_PERMISSION}>
              <NewDistrictButton searchParams={searchParams} />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <DistrictsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewDistrictButton({ searchParams }: Pick<Props, "searchParams">) {
  const [divisions, zones, query] = await Promise.all([getDistrictDivisionOptions(), getDistrictZoneOptions(), searchParams]);
  if (!divisions.ok || !zones.ok) return null;
  return (
    <FormModalButton
      mode="create"
      label="New district"
      title="New district"
      action={saveDistrictAction.bind(null, null)}
      submitLabel="Create"
    >
      <DistrictFields divisions={divisions.data} zones={zones.data} defaultDivisionId={idFilter(query.division)} />
    </FormModalButton>
  );
}

async function DistrictsList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const divisionId = idFilter(query.division);
  const shippingZoneId = idFilter(query.zone);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, divisions, zones, result] = await Promise.all([
    requireSession(),
    getDistrictDivisionOptions(),
    getDistrictZoneOptions(),
    tryApi(() =>
      settingsApi.listDistricts({ divisionId, shippingZoneId, search, isActive, limit: LOCATION_PAGE_SIZE, offset }),
    ),
  ]);
  const divisionList = divisions.ok ? divisions.data : [];
  const zoneList = zones.ok ? zones.data : [];
  const filtered = Boolean(search) || divisionId !== undefined || shippingZoneId !== undefined || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} district(s)` : "Districts"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search by name" filtered={filtered}>
            <FilterSelect
              name="division"
              label="Division"
              value={divisionId ? String(divisionId) : undefined}
              options={divisionList.map((division) => ({ value: String(division.id), label: division.name }))}
              allLabel="All divisions"
            />
            <FilterSelect
              name="zone"
              label="Shipping zone"
              value={shippingZoneId ? String(shippingZoneId) : undefined}
              options={zoneList.map((zone) => ({ value: String(zone.id), label: zone.name }))}
              allLabel="All zones"
            />
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title={filtered ? "No districts match these filters" : "No districts yet"}
          description={filtered ? undefined : "Add the districts of a division with New district."}
        />
      ) : (
        <>
          <DistrictsTable
            rows={result.data.items}
            divisions={divisionList}
            zones={zoneList}
            canManage={canManageDistricts(session)}
          />
          <Pagination
            basePath={basePath}
            query={{
              q: search,
              division: divisionId,
              zone: shippingZoneId,
              active: isActive === undefined ? undefined : String(isActive),
            }}
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
