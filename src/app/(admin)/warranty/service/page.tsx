import type { Metadata } from "next";
import { Plus, SearchCheck, Wrench } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { DateRangeFilter, readDocumentFilters } from "@/modules/inventory/components/documents/list-filters";
import { warrantyApi } from "@/modules/warranty/api";
import { DeskTabs } from "@/modules/warranty/components/desk-tabs";
import { JobsTable } from "@/modules/warranty/components/jobs-table";
import { getDeviceTypes, getTechnicians } from "@/modules/warranty/queries";
import { JOB_STATUSES, JOB_TYPES, WARRANTY_MANAGE_PERMISSION, warrantyLabel } from "@/modules/warranty/types";

export const metadata: Metadata = { title: "Warranty & Service" };

const basePath = "/warranty/service";
type Props = PageProps<"/warranty/service">;

const STATUS_OPTIONS = [{ value: "Open", label: "Open (with the shop)" }, ...JOB_STATUSES.map((s) => ({ value: s, label: warrantyLabel(s) }))];
const TYPE_OPTIONS = JOB_TYPES.map((t) => ({ value: t, label: t === "Warranty" ? "Warranty" : "Paid" }));

export default function ServiceDeskPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Warranty & Service"
        description="Devices in for repair, under warranty or paid: intake, diagnosis, parts, billing and delivery."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty" }, { label: "Service jobs" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/warranty/service/check" variant="outline">
              <SearchCheck className="size-4" aria-hidden /> Warranty check
            </LinkButton>
            <Suspense>
              <PermissionOnly code={WARRANTY_MANAGE_PERMISSION}>
                <LinkButton href="/warranty/service/jobs/new">
                  <Plus className="size-4" aria-hidden /> New job
                </LinkButton>
              </PermissionOnly>
            </Suspense>
          </div>
        }
      />
      <Card>
        <DeskTabs active="jobs" />
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <JobList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function JobList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const { search, status, from, to, offset } = readDocumentFilters(query);
  const jobType = firstParam(query.type);
  const technicianParam = firstParam(query.technician);
  const technicianUserId = technicianParam ? (parseIdParam(technicianParam) ?? undefined) : undefined;
  const deviceParam = firstParam(query.device);
  const deviceTypeLookupDataId = deviceParam ? (parseIdParam(deviceParam) ?? undefined) : undefined;

  const [result, technicians, deviceTypes] = await Promise.all([
    tryApi(() =>
      warrantyApi.jobs.list({ search, status, jobType, technicianUserId, deviceTypeLookupDataId, from, to, limit: CRUD_PAGE_SIZE, offset }),
    ),
    getTechnicians(),
    getDeviceTypes(),
  ]);
  const filtered = Boolean(search || status || jobType || technicianUserId || deviceTypeLookupDataId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} job(s)` : "Service jobs"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Job, customer, mobile, serial" filtered={filtered}>
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-44" />
            <FilterSelect name="type" label="Type" value={jobType} options={TYPE_OPTIONS} allLabel="Warranty & paid" className="w-36" />
            <FilterSelect
              name="device"
              label="Device"
              value={deviceParam}
              options={(deviceTypes.ok ? deviceTypes.data : []).map((d) => ({ value: String(d.id), label: d.name }))}
              allLabel="All devices"
              className="w-36"
            />
            <FilterSelect
              name="technician"
              label="Technician"
              value={technicianParam}
              options={(technicians.ok ? technicians.data : []).map((t) => ({ value: String(t.id), label: t.name }))}
              allLabel="All technicians"
              className="w-40"
            />
            <DateRangeFilter from={from} to={to} />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={filtered ? "No jobs match these filters" : "No service jobs yet"}
          description={filtered ? undefined : "Open a job when a customer brings a device in: New job, or start from the warranty check."}
        />
      ) : (
        <>
          <JobsTable rows={result.data.items} />
          <Pagination
            basePath={basePath}
            query={{ q: search, status, type: jobType, technician: technicianParam, device: deviceParam, from, to }}
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
