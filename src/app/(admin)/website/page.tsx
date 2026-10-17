import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Badge } from "@/core/ui/badge";
import { PageHeader } from "@/core/ui/page-header";
import { websiteApi } from "@/modules/website/api";
import { websiteTables, type WebsiteTableDefinition } from "@/modules/website/tables";

export const metadata: Metadata = { title: "WebSite" };

export default function WebsiteOverviewPage() {
  const content = websiteTables.filter((table) => !table.inbound);
  const inbound = websiteTables.filter((table) => table.inbound);

  return (
    <>
      <PageHeader
        title="WebSite"
        description="Manage the public website's content and review submissions."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "WebSite" }]}
      />
      <TableGroup title="Content" tables={content} />
      <TableGroup title="Submissions" tables={inbound} />
    </>
  );
}

function TableGroup({ title, tables }: { title: string; tables: WebsiteTableDefinition[] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tables.map((table) => (
          <Link
            key={table.table}
            href={`/website/${table.table}`}
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
          >
            <div className="flex items-start justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                <table.icon className="size-5" aria-hidden />
              </span>
              <Suspense fallback={<span className="h-5 w-10 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />}>
                <RecordCount table={table.table} />
              </Suspense>
            </div>
            <p className="mt-4 font-semibold text-gray-800 dark:text-white/90">{table.label}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{table.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function RecordCount({ table }: { table: string }) {
  const result = await tryApi(() => websiteApi.getAll(table));
  if (!result.ok) return <Badge tone="error">{result.error.status ? `Error ${result.error.status}` : "Offline"}</Badge>;
  return <Badge tone="brand">{result.data.length}</Badge>;
}
