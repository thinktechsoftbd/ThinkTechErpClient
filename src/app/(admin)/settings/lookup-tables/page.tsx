import type { Metadata } from "next";
import { Table2 } from "lucide-react";
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
import { canManageSettings } from "@/modules/settings/access";
import { saveLookupTableAction } from "@/modules/settings/actions";
import { settingsApi } from "@/modules/settings/api";
import { LookupTableFields } from "@/modules/settings/components/lookup-fields";
import { LookupTablesTable } from "@/modules/settings/components/tables";
import { SETTINGS_MANAGE_PERMISSION } from "@/modules/settings/types";

export const metadata: Metadata = { title: "Lookup Tables" };

const basePath = "/settings/lookup-tables";
type Props = PageProps<"/settings/lookup-tables">;

export default function LookupTablesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Lookup Tables"
        description="Named lists of values used in drop-downs, e.g. Currency."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings" }, { label: "Lookup Tables" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SETTINGS_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New lookup table"
                title="New lookup table"
                action={saveLookupTableAction.bind(null, null)}
                submitLabel="Create"
              >
                <LookupTableFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <LookupTablesList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function LookupTablesList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => settingsApi.getLookupTables({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} lookup table(s)` : "Lookup tables"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search by name" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Table2}
          title={filtered ? "No lookup tables match these filters" : "No lookup tables yet"}
          description={filtered ? undefined : "Create one with New lookup table."}
        />
      ) : (
        <>
          <LookupTablesTable rows={result.data.items} canManage={canManageSettings(session)} />
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
