import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ConfirmActionButton } from "@/core/forms/confirm-action-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { decodeParam } from "@/core/utils/params";
import { deleteWebsiteRecordAction, saveWebsiteRecordAction } from "@/modules/website/actions";
import { websiteApi } from "@/modules/website/api";
import { RecordForm } from "@/modules/website/components/record-form";
import { recordIdKey, recordTitle } from "@/modules/website/records";
import { getWebsiteTable } from "@/modules/website/tables";

export const metadata: Metadata = { title: "Edit record" };

type Props = PageProps<"/website/[table]/[id]">;

export default function WebsiteRecordPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RecordDetail params={params} />
    </Suspense>
  );
}

async function RecordDetail({ params }: Pick<Props, "params">) {
  const { table, id: rawId } = await params;
  const definition = getWebsiteTable(table);
  if (!definition) notFound();
  const id = decodeParam(rawId);
  const basePath = `/website/${definition.table}`;

  const result = await tryApi(() => websiteApi.getById(definition.table, id));
  if (!result.ok && result.error.status === 404) notFound();
  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }

  const record = result.data;
  const title = recordTitle(record, `${definition.singular} ${id}`);

  return (
    <>
      <PageHeader
        title={title}
        description={`${definition.singular} · ID ${id}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "WebSite", href: "/website" },
          { label: definition.label, href: basePath },
          { label: id },
        ]}
        actions={
          <ConfirmActionButton
            action={deleteWebsiteRecordAction.bind(null, definition.table, id, basePath)}
            confirmMessage={`Delete this ${definition.singular.toLowerCase()}? This cannot be undone.`}
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </ConfirmActionButton>
        }
      />
      <Card>
        <CardHeader title={`Edit ${definition.singular.toLowerCase()}`} />
        <CardBody>
          <RecordForm
            action={saveWebsiteRecordAction.bind(null, definition.table, id)}
            mode="edit"
            record={record}
            idKey={recordIdKey(record)}
            cancelHref={basePath}
          />
        </CardBody>
      </Card>
    </>
  );
}
