import type { Metadata } from "next";
import { List } from "lucide-react";
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
import { canManageSettings } from "@/modules/settings/access";
import { saveLookupDataAction } from "@/modules/settings/actions";
import { settingsApi } from "@/modules/settings/api";
import { LookupDataFields } from "@/modules/settings/components/lookup-fields";
import { LookupDataTable } from "@/modules/settings/components/tables";
import { getAllLookupTables } from "@/modules/settings/queries";
import { SETTINGS_MANAGE_PERMISSION } from "@/modules/settings/types";

export const metadata: Metadata = { title: "Lookup Data" };

const basePath = "/settings/lookup-data";
type Props = PageProps<"/settings/lookup-data">;

function tableFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

export default function LookupDataPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Lookup Data"
        description="The values of each lookup table, e.g. BDT and USD in Currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings" }, { label: "Lookup Data" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SETTINGS_MANAGE_PERMISSION}>
              <NewValueButton searchParams={searchParams} />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <LookupDataList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewValueButton({ searchParams }: Pick<Props, "searchParams">) {
  const [tables, query] = await Promise.all([getAllLookupTables(), searchParams]);
  if (!tables.ok) return null;
  return (
    <FormModalButton
      mode="create"
      label="New value"
      title="New lookup value"
      action={saveLookupDataAction.bind(null, null)}
      submitLabel="Create"
    >
      <LookupDataFields tables={tables.data} defaultTableId={tableFilter(query.table)} />
    </FormModalButton>
  );
}

async function LookupDataList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const lookupTableId = tableFilter(query.table);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, tables, result] = await Promise.all([
    requireSession(),
    getAllLookupTables(),
    tryApi(() => settingsApi.getLookupData({ lookupTableId, search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const tableList = tables.ok ? tables.data : [];
  const filtered = Boolean(search) || lookupTableId !== undefined || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} value(s)` : "Values"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search values" filtered={filtered}>
            <FilterSelect
              name="table"
              label="Lookup table"
              value={lookupTableId ? String(lookupTableId) : undefined}
              options={tableList.map((table) => ({ value: String(table.id), label: table.name }))}
              allLabel="All lookup tables"
              className="w-48"
            />
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={List}
          title={filtered ? "No values match these filters" : "No lookup values yet"}
          description={filtered ? undefined : "Add values with New value."}
        />
      ) : (
        <>
          <LookupDataTable rows={result.data.items} tables={tableList} canManage={canManageSettings(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, table: lookupTableId, active: isActive === undefined ? undefined : String(isActive) }}
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
