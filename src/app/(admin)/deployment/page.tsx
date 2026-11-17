import type { Metadata } from "next";
import { Server } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ListToolbar } from "@/core/crud/list-toolbar";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { DeploymentOrganizationsTable } from "@/modules/security/components/deployments/deployment-organizations-table";
import { deploymentApi } from "@/modules/security/deployment-api";
import { DEPLOYMENT_PAGE_SIZE } from "@/modules/security/deployment-types";

export const metadata: Metadata = { title: "Deployment" };

const basePath = "/deployment";
type Props = PageProps<"/deployment">;

export default function DeploymentPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Deployment"
        description="What is deployed for each organization, by service type. Open an organization to see its details or add a deployment."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Deployment" }]}
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <DeploymentOrganizations searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function DeploymentOrganizations({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const offset = parseOffset(query.offset);
  const result = await tryApi(() => deploymentApi.organizations({ search, limit: DEPLOYMENT_PAGE_SIZE, offset }));

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} organization(s)` : "Organizations"}
        actions={<ListToolbar basePath={basePath} search={search} placeholder="Name, code or slug" filtered={Boolean(search)} />}
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState icon={Server} title={search ? "No organizations match this search" : "No organizations yet"} />
      ) : (
        <>
          <DeploymentOrganizationsTable rows={result.data.items} />
          <Pagination
            basePath={basePath}
            query={{ q: search }}
            offset={offset}
            limit={DEPLOYMENT_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
