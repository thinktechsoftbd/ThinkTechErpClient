import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requirePermission } from "@/core/auth/guards";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { parseIdParam } from "@/core/utils/params";
import { saveJobAction } from "@/modules/warranty/actions/jobs";
import { warrantyApi } from "@/modules/warranty/api";
import { JobForm } from "@/modules/warranty/components/job-form";
import { getDeviceTypes, getTechnicians } from "@/modules/warranty/queries";
import { WARRANTY_MANAGE_PERMISSION } from "@/modules/warranty/types";

export const metadata: Metadata = { title: "Edit service job" };

type Props = PageProps<"/warranty/service/jobs/[jobId]/edit">;

export default function EditJobPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditJob params={params} />
    </Suspense>
  );
}

async function EditJob({ params }: Pick<Props, "params">) {
  await requirePermission(WARRANTY_MANAGE_PERMISSION);
  const id = parseIdParam((await params).jobId);
  if (id === null) notFound();
  const result = await tryApi(() => warrantyApi.jobs.get(id));
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }
  const job = result.data;
  // Only a job still with the shop can be changed.
  if (job.status === "Delivered" || job.status === "Cancelled") redirect(`/warranty/service/jobs/${id}`);

  const [deviceTypes, technicians, card, customers] = await Promise.all([
    getDeviceTypes(),
    getTechnicians(),
    job.warrantyRegistrationId ? tryApi(() => warrantyApi.cards.get(job.warrantyRegistrationId!)) : Promise.resolve(null),
    job.customerId ? tryApi(() => warrantyApi.lookups.customers({ ids: String(job.customerId) })) : Promise.resolve(null),
  ]);
  if (!deviceTypes.ok) return <Card><ApiErrorState error={deviceTypes.error} /></Card>;

  return (
    <>
      <PageHeader
        title={`Edit ${job.jobNo}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Warranty", href: "/warranty/service" },
          { label: job.jobNo, href: `/warranty/service/jobs/${id}` },
          { label: "Edit" },
        ]}
      />
      <JobForm
        action={saveJobAction.bind(null, id)}
        deviceTypes={deviceTypes.data}
        technicians={technicians.ok ? technicians.data : []}
        job={job}
        card={card?.ok ? card.data : null}
        customer={customers?.ok ? (customers.data[0] ?? null) : null}
        cancelHref={`/warranty/service/jobs/${id}`}
      />
    </>
  );
}
