import type { Metadata } from "next";
import { Boxes } from "lucide-react";
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
import { canManageSecurity } from "@/modules/security/access";
import { saveSubscriptionModuleAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { SubscriptionModuleFields } from "@/modules/security/components/subscription-module-fields";
import { SubscriptionModulesTable } from "@/modules/security/components/subscription-tables";
import { SECURITY_MANAGE_PERMISSION } from "@/modules/security/types";

export const metadata: Metadata = { title: "Subscription Modules" };

const basePath = "/security/subscription-modules";
type Props = PageProps<"/security/subscription-modules">;

export default function SubscriptionModulesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Subscription Modules"
        description="The modules an organization can subscribe to."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Subscription Modules" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SECURITY_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New module"
                title="New subscription module"
                action={saveSubscriptionModuleAction.bind(null, null)}
                submitLabel="Create"
              >
                <SubscriptionModuleFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <ModulesList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ModulesList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => securityApi.getSubscriptionModules({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} module(s)` : "Modules"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search modules" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={filtered ? "No modules match these filters" : "No subscription modules yet"}
          description={filtered ? undefined : "Create one with New module."}
        />
      ) : (
        <>
          <SubscriptionModulesTable rows={result.data.items} canManage={canManageSecurity(session)} />
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
