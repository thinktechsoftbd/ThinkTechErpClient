import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { canAccessModule } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, FilterSelect, ListToolbar, parseActiveFilter } from "@/core/crud/list-toolbar";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageOrganizations } from "@/modules/security/access";
import { createOrganizationFromListAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { PermissionOnly } from "@/core/crud/permission-only";
import { OrganizationFields } from "@/modules/security/components/forms";
import { OrganizationsTable } from "@/modules/security/components/tables";
import { ORGANIZATION_MANAGE_PERMISSION, type Organization } from "@/modules/security/types";
import { smsModule } from "@/modules/sms/module";

export const metadata: Metadata = { title: "Organizations" };

const basePath = "/security/organizations";
type Props = PageProps<"/security/organizations">;

const KIND_OPTIONS = [
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
] as const;

export default function OrganizationsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Organizations"
        description="Companies and branches using the ERP."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Organizations" }]}
        actions={
          <Suspense>
            <PermissionOnly code={ORGANIZATION_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New organization"
                title="New organization"
                description="Fill in its details. The Organization Id is generated when left empty."
                action={createOrganizationFromListAction}
                submitLabel="Create organization"
                size="lg"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <OrganizationFields />
                </div>
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <OrganizationsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

/** Whether the organization's name, code, Organization Id, email, phone or city contains the search. */
function matches(organization: Organization, search: string) {
  const needle = search.toLowerCase();
  return [
    organization.nameEn,
    organization.nameBn,
    organization.code,
    organization.objectId,
    organization.email,
    organization.phone,
    organization.city,
    organization.country,
  ].some((value) => value?.toLowerCase().includes(needle));
}

// The API returns every organization (there are few), so search and filters run here on the server.
async function OrganizationsList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim();
  const kindParam = firstParam(query.kind);
  const kind = KIND_OPTIONS.some((option) => option.value === kindParam) ? kindParam : undefined;
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);

  const [session, result] = await Promise.all([requireSession(), tryApi(() => securityApi.getOrganizations())]);
  const filtered = Boolean(search || kind || isActive !== undefined);
  const rows = result.ok
    ? result.data.filter(
        (organization) =>
          (!search || matches(organization, search)) &&
          (!kind || organization.isExternal === (kind === "external")) &&
          (isActive === undefined || organization.isActive === isActive),
      )
    : [];

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(rows.length)} organization(s)` : "Organizations"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Name, code, email, phone" filtered={filtered}>
            <FilterSelect name="kind" label="Type" value={kind} options={KIND_OPTIONS} allLabel="Internal & external" className="w-44" />
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={filtered ? "No organizations match these filters" : "No organizations yet"}
        />
      ) : (
        // The Allocations links open SMS → Allocations, so only for users who can open the SMS module.
        <OrganizationsTable
          organizations={rows}
          canManage={canManageOrganizations(session)}
          smsLinks={canAccessModule(session, smsModule)}
        />
      )}
    </>
  );
}
