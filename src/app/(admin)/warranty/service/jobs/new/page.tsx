import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requirePermission } from "@/core/auth/guards";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { saveJobAction } from "@/modules/warranty/actions/jobs";
import { warrantyApi } from "@/modules/warranty/api";
import { JobForm } from "@/modules/warranty/components/job-form";
import { getDeviceTypes, getTechnicians } from "@/modules/warranty/queries";
import { WARRANTY_MANAGE_PERMISSION } from "@/modules/warranty/types";

export const metadata: Metadata = { title: "New service job" };

type Props = PageProps<"/warranty/service/jobs/new">;

export default function NewJobPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New service job"
        description="The device the customer brought in: under warranty, or paid service (also for units bought elsewhere)."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty/service" }, { label: "New job" }]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewJob searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewJob({ searchParams }: Pick<Props, "searchParams">) {
  await requirePermission(WARRANTY_MANAGE_PERMISSION);
  const query = await searchParams;
  const cardParam = firstParam(query.card);
  const cardId = cardParam ? parseIdParam(cardParam) : null;
  const type = firstParam(query.type);
  const [deviceTypes, technicians, card] = await Promise.all([
    getDeviceTypes(),
    getTechnicians(),
    cardId ? tryApi(() => warrantyApi.cards.get(cardId)) : Promise.resolve(null),
  ]);
  if (!deviceTypes.ok) return <Card><ApiErrorState error={deviceTypes.error} /></Card>;

  return (
    <JobForm
      action={saveJobAction.bind(null, null)}
      deviceTypes={deviceTypes.data}
      technicians={technicians.ok ? technicians.data : []}
      card={card?.ok ? card.data : null}
      initialType={type === "Paid" || type === "Warranty" ? type : undefined}
      cancelHref="/warranty/service"
    />
  );
}
