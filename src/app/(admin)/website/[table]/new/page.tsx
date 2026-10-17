import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Alert } from "@/core/ui/alert";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { saveWebsiteRecordAction } from "@/modules/website/actions";
import { websiteApi } from "@/modules/website/api";
import { RecordForm } from "@/modules/website/components/record-form";
import { recordIdKey } from "@/modules/website/records";
import { getWebsiteTable } from "@/modules/website/tables";

export const metadata: Metadata = { title: "New record" };

type Props = PageProps<"/website/[table]/new">;

export default function NewWebsiteRecordPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewRecord params={params} />
    </Suspense>
  );
}

async function NewRecord({ params }: Pick<Props, "params">) {
  const definition = getWebsiteTable((await params).table);
  if (!definition) notFound();

  // An existing row is the only schema information the API exposes; use it as the field template.
  const rows = await tryApi(() => websiteApi.getAll(definition.table));
  const sample = rows.ok ? rows.data[0] : undefined;
  const basePath = `/website/${definition.table}`;

  return (
    <>
      <PageHeader
        title={`New ${definition.singular.toLowerCase()}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "WebSite", href: "/website" },
          { label: definition.label, href: basePath },
          { label: "New" },
        ]}
      />
      <Card>
        <CardHeader title={definition.singular} description={definition.description} />
        <CardBody>
          {!sample && (
            <Alert tone="info" className="mb-6">
              This table has no rows yet, so its columns can&apos;t be inferred. Enter the new record as JSON using the
              table&apos;s column names.
            </Alert>
          )}
          <RecordForm
            action={saveWebsiteRecordAction.bind(null, definition.table, null)}
            mode="create"
            record={sample ?? {}}
            idKey={sample ? recordIdKey(sample) : undefined}
            cancelHref={basePath}
          />
        </CardBody>
      </Card>
    </>
  );
}
