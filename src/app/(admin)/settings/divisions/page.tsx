import type { Metadata } from "next";
import { Map as MapIcon } from "lucide-react";
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
import { canManageDivisions } from "@/modules/settings/access";
import { saveDivisionAction } from "@/modules/settings/actions";
import { settingsApi } from "@/modules/settings/api";
import { DivisionFields } from "@/modules/settings/components/division-fields";
import { DivisionsTable } from "@/modules/settings/components/division-tables";
import { DIVISION_MANAGE_PERMISSION, LOCATION_PAGE_SIZE } from "@/modules/settings/types";

export const metadata: Metadata = { title: "Divisions" };

const basePath = "/settings/divisions";
type Props = PageProps<"/settings/divisions">;

export default function DivisionsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Divisions"
        description="The divisions of the country, each with its Bangla name; districts belong to one."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings" }, { label: "Divisions" }]}
        actions={
          <Suspense>
            <PermissionOnly code={DIVISION_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New division"
                title="New division"
                action={saveDivisionAction.bind(null, null)}
                submitLabel="Create"
              >
                <DivisionFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <DivisionsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function DivisionsList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => settingsApi.listDivisions({ search, isActive, limit: LOCATION_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} division(s)` : "Divisions"}
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
          icon={MapIcon}
          title={filtered ? "No divisions match these filters" : "No divisions yet"}
          description={filtered ? undefined : "Add one with New division."}
        />
      ) : (
        <>
          <DivisionsTable rows={result.data.items} canManage={canManageDivisions(session)} />
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
