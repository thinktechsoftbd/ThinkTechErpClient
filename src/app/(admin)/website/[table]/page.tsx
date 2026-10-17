import type { Metadata } from "next";
import Form from "next/form";
import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Input } from "@/core/forms/fields";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Button, LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { websiteApi } from "@/modules/website/api";
import { RecordsTable } from "@/modules/website/components/records-table";
import { matchesSearch, pickColumns } from "@/modules/website/records";
import { getWebsiteTable } from "@/modules/website/tables";
import { WEBSITE_PAGE_SIZE } from "@/modules/website/types";

export const metadata: Metadata = { title: "WebSite content" };

type Props = PageProps<"/website/[table]">;

export default function WebsiteTablePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TableView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TableView({ params, searchParams }: Props) {
  const definition = getWebsiteTable((await params).table);
  if (!definition) notFound();

  const query = await searchParams;
  const search = firstParam(query.q);
  const offset = parseOffset(query.offset);
  const basePath = `/website/${definition.table}`;
  const result = await tryApi(() => websiteApi.getAll(definition.table));

  const header = (
    <PageHeader
      title={definition.label}
      description={definition.description}
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "WebSite", href: "/website" }, { label: definition.label }]}
      actions={
        <LinkButton href={`${basePath}/new`}>
          <Plus className="size-4" aria-hidden /> New {definition.singular.toLowerCase()}
        </LinkButton>
      }
    />
  );

  if (!result.ok) {
    return (
      <>
        {header}
        <Card>
          <ApiErrorState error={result.error} />
        </Card>
      </>
    );
  }

  const filtered = search ? result.data.filter((record) => matchesSearch(record, search)) : result.data;
  const page = filtered.slice(offset, offset + WEBSITE_PAGE_SIZE);
  const columns = pickColumns(definition, result.data);

  return (
    <>
      {header}
      <Card>
        <CardHeader
          title={`${result.data.length} ${result.data.length === 1 ? definition.singular.toLowerCase() : definition.label.toLowerCase()}`}
          actions={
            <Form action={basePath} className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <Input name="q" defaultValue={search} placeholder="Search" className="h-9 w-56 pl-9" aria-label="Search records" />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </Form>
          }
        />
        {page.length === 0 ? (
          <EmptyState
            icon={definition.icon}
            title={search ? `Nothing matches “${search}”` : `No ${definition.label.toLowerCase()} yet`}
            action={!search && <LinkButton href={`${basePath}/new`}>New {definition.singular.toLowerCase()}</LinkButton>}
          />
        ) : (
          <>
            <RecordsTable definition={definition} records={page} columns={columns} />
            <Pagination
              basePath={basePath}
              query={{ q: search }}
              offset={offset}
              limit={WEBSITE_PAGE_SIZE}
              count={page.length}
              total={filtered.length}
            />
          </>
        )}
      </Card>
    </>
  );
}
