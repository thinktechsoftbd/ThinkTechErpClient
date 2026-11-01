import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageSms } from "@/modules/sms/access";
import { saveAllocationAction } from "@/modules/sms/actions/allocations";
import { smsApi } from "@/modules/sms/api";
import { AllocationFields } from "@/modules/sms/components/allocations/allocation-fields";
import { AllocationsTable } from "@/modules/sms/components/allocations/allocations-table";
import { DateRangeFilter, dateParam, guidParam, idParam } from "@/modules/sms/components/list-filters";
import { getSmsOrganizations, getSmsProviders } from "@/modules/sms/queries";
import { SMS_MANAGE_PERMISSION, organizationLabel, providerLabel } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS Allocations" };

const basePath = "/sms/allocations";
type Props = PageProps<"/sms/allocations">;

export default function SmsAllocationsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Allocations"
        description="SMS given to organizations from a provider's stock. Changes can't leave an organization below what it already used."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Allocations" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SMS_MANAGE_PERMISSION}>
              <NewAllocationButton searchParams={searchParams} />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <AllocationList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

/**
 * Preselects the organization the list is filtered to (?organizationId=), and opens on arrival with
 * ?new=1 (e.g. from Organizations' "Allocate").
 */
async function NewAllocationButton({ searchParams }: Pick<Props, "searchParams">) {
  const [query, providers, organizations] = await Promise.all([searchParams, getSmsProviders(), getSmsOrganizations()]);
  const organizationId = guidParam(query.organizationId);
  return (
    <FormModalButton
      // A new preselected organization mounts the button afresh, so ?new=1 opens it again.
      key={organizationId ?? "any"}
      mode="create"
      label="Allocate"
      title="Allocate SMS"
      action={saveAllocationAction.bind(null, null)}
      submitLabel="Allocate"
      defaultOpen={firstParam(query.new) === "1"}
    >
      <AllocationFields
        providers={providers.ok ? providers.data : []}
        organizations={organizations.ok ? organizations.data.items : []}
        organizationObjectId={organizationId}
      />
    </FormModalButton>
  );
}

async function AllocationList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const providerId = idParam(query.provider);
  const organizationId = guidParam(query.organizationId);
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [session, providers, organizations, result] = await Promise.all([
    requireSession(),
    getSmsProviders(),
    getSmsOrganizations(),
    tryApi(() => smsApi.allocations.list({ search, providerId, organizationId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const providerList = providers.ok ? providers.data : [];
  const organizationList = organizations.ok ? organizations.data.items : [];
  const filtered = Boolean(search || providerId || organizationId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} allocation(s)` : "Allocations"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Organization, provider, remarks" filtered={filtered}>
            <FilterSelect
              name="provider"
              label="Provider"
              value={providerId ? String(providerId) : undefined}
              options={providerList.map((provider) => ({ value: String(provider.id), label: providerLabel(provider) }))}
              allLabel="All providers"
              className="w-44"
            />
            <FilterSelect
              name="organizationId"
              label="Organization"
              value={organizationId}
              options={organizationList
                .filter((organization) => organization.allocationCount > 0 || organization.objectId === organizationId)
                .map((organization) => ({ value: organization.objectId, label: organizationLabel(organization) }))}
              allLabel="All organizations"
              className="w-48"
            />
            <DateRangeFilter from={from} to={to} />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={filtered ? "No allocations match these filters" : "No allocations yet"}
          description={filtered ? undefined : "Give an organization SMS from a provider's stock with Allocate."}
        />
      ) : (
        <>
          <AllocationsTable
            rows={result.data.items}
            providers={providerList}
            organizations={organizationList}
            canManage={canManageSms(session)}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, provider: providerId, organizationId, from, to }}
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
