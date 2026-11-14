import type { Metadata } from "next";
import { MapPin } from "lucide-react";
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
import { canManageAreas } from "@/modules/settings/access";
import { saveAreaAction } from "@/modules/settings/actions";
import { settingsApi } from "@/modules/settings/api";
import { AreaFields } from "@/modules/settings/components/area-fields";
import { AreasTable } from "@/modules/settings/components/area-tables";
import { getAllDistricts, getShippingZones } from "@/modules/settings/queries";
import { AREA_MANAGE_PERMISSION, AREA_TYPES } from "@/modules/settings/types";

export const metadata: Metadata = { title: "Areas" };

const basePath = "/settings/areas";
type Props = PageProps<"/settings/areas">;

const areaTypeOptions = AREA_TYPES.map((type) => ({ value: type.value, label: type.label }));

function districtFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

function areaTypeFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw && AREA_TYPES.some((type) => type.value === raw) ? raw : undefined;
}

export default function AreasPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Areas"
        description="Upazilas, thanas and city areas, with their district, shipping zone and Bangla name."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings" }, { label: "Areas" }]}
        actions={
          <Suspense>
            <PermissionOnly code={AREA_MANAGE_PERMISSION}>
              <NewAreaButton searchParams={searchParams} />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={5} />}>
          <AreasList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewAreaButton({ searchParams }: Pick<Props, "searchParams">) {
  const [districts, zones, query] = await Promise.all([getAllDistricts(), getShippingZones(), searchParams]);
  if (!districts.ok || !zones.ok) return null;
  return (
    <FormModalButton
      mode="create"
      label="New area"
      title="New area"
      action={saveAreaAction.bind(null, null)}
      submitLabel="Create"
    >
      <AreaFields districts={districts.data} zones={zones.data} defaultDistrictId={districtFilter(query.district)} />
    </FormModalButton>
  );
}

async function AreasList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const districtId = districtFilter(query.district);
  const areaType = areaTypeFilter(query.type);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, districts, zones, result] = await Promise.all([
    requireSession(),
    getAllDistricts(),
    getShippingZones(),
    tryApi(() => settingsApi.getAreas({ districtId, areaType, search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const districtList = districts.ok ? districts.data : [];
  const zoneList = zones.ok ? zones.data : [];
  const filtered = Boolean(search) || districtId !== undefined || areaType !== undefined || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} area(s)` : "Areas"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search by name" filtered={filtered}>
            <FilterSelect
              name="district"
              label="District"
              value={districtId ? String(districtId) : undefined}
              options={districtList.map((district) => ({ value: String(district.id), label: district.name }))}
              allLabel="All districts"
              className="w-48"
            />
            <FilterSelect name="type" label="Area type" value={areaType} options={areaTypeOptions} allLabel="All types" />
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={filtered ? "No areas match these filters" : "No areas yet"}
          description={filtered ? undefined : "Add the upazilas, thanas or city areas of a district with New area."}
        />
      ) : (
        <>
          <AreasTable
            rows={result.data.items}
            districts={districtList}
            zones={zoneList}
            canManage={canManageAreas(session)}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, district: districtId, type: areaType, active: isActive === undefined ? undefined : String(isActive) }}
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
