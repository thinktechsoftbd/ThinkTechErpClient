import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { CRUD_PAGE_SIZE, ListToolbar } from "@/core/crud/list-toolbar";
import { Checkbox } from "@/core/forms/fields";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageSms } from "@/modules/sms/access";
import { smsApi } from "@/modules/sms/api";
import { OrganizationsTable } from "@/modules/sms/components/organizations/organizations-table";

export const metadata: Metadata = { title: "SMS Organizations" };

const basePath = "/sms/organizations";
type Props = PageProps<"/sms/organizations">;

export default function SmsOrganizationsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Organizations"
        description="Each organization's SMS: allocated, used and left. Record the SMS they send, or correct the total used."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Organizations" }]}
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <OrganizationList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function OrganizationList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const onlyAllocated = firstParam(query.allocated) === "1";
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => smsApi.organizations.list({ search, onlyAllocated, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || onlyAllocated;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} organization(s)` : "Organizations"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Name or code" filtered={filtered}>
            <Checkbox name="allocated" value="1" defaultChecked={onlyAllocated} label="Only with SMS" className="px-1" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={filtered ? "No organizations match these filters" : "No organizations yet"}
          description={filtered ? undefined : "Organizations are added in Security → Organizations."}
        />
      ) : (
        <>
          <OrganizationsTable rows={result.data.items} canManage={canManageSms(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, allocated: onlyAllocated ? "1" : undefined }}
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
