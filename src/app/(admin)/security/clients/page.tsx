import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ACTIVE_FILTER_OPTIONS, FilterSelect, ListToolbar, parseActiveFilter } from "@/core/crud/list-toolbar";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { LinkButton } from "@/core/ui/button";
import { formatNumber } from "@/core/utils/format";
import { tryApi } from "@/core/api/client";
import { securityApi } from "@/modules/security/api";
import { saveOrganizationClientAction } from "@/modules/security/actions";
import { OrganizationClientFields } from "@/modules/security/components/organization-client-fields";
import { OrganizationClientsTable } from "@/modules/security/components/organization-clients-table";
import { canManageSecurity } from "@/modules/security/access";

export const metadata: Metadata = { title: "Clients" };

const basePath = "/security/clients";
const pageSize = 50;
type Props = PageProps<"/security/clients">;

export default function OrganizationClientsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Clients"
        description="Integration clients, acting users, scopes, and secret hashes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Clients" },
        ]}
        actions={
          <>
            <LinkButton href="/security/subscriptions" variant="outline">Subscriptions</LinkButton>
            <Suspense>
              <PermissionOnly code="SECURITY.M">
                <FormModalButton
                  mode="create"
                  label="New client"
                  title="New API client"
                  description="The API stores only the SHA-256 hash you provide."
                  action={saveOrganizationClientAction.bind(null, null)}
                  submitLabel="Create client"
                  size="lg"
                >
                  <OrganizationClientFields />
                </FormModalButton>
              </PermissionOnly>
            </Suspense>
          </>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <OrganizationClientsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function OrganizationClientsList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim();
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);
  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => securityApi.getOrganizationClients({ limit: pageSize, offset, search, isActive })),
  ]);
  const filtered = Boolean(search || isActive !== undefined);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} client(s)` : "API clients"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Client name or scope" filtered={filtered}>
            <FilterSelect
              name="active"
              label="Status"
              value={activeParam}
              options={ACTIVE_FILTER_OPTIONS}
              allLabel="All statuses"
            />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <>
          <EmptyState
            title={filtered ? "No clients match these filters" : "No clients yet"}
            description={filtered ? undefined : "Create an API client to manage its acting user and scopes."}
          />
          {result.data.totalCount > 0 && (
            <Pagination
              basePath={basePath}
              query={{ q: search, active: activeParam, limit: pageSize }}
              offset={result.data.offset}
              limit={result.data.limit}
              count={0}
              total={result.data.totalCount}
            />
          )}
        </>
      ) : (
        <>
          <OrganizationClientsTable clients={result.data.items} canManage={canManageSecurity(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, active: activeParam, limit: pageSize }}
            offset={result.data.offset}
            limit={result.data.limit}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
