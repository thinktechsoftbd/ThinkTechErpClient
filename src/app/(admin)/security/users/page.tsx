import type { Metadata } from "next";
import Form from "next/form";
import { Plus, Search, Users } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Input } from "@/core/forms/fields";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Button, LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { securityApi } from "@/modules/security/api";
import { SecurityEndpointHint } from "@/modules/security/components/missing-endpoint";
import { UsersTable } from "@/modules/security/components/tables";
import { SECURITY_PAGE_SIZE } from "@/modules/security/types";

export const metadata: Metadata = { title: "Users" };

const basePath = "/security/users";

export default function UsersPage({ searchParams }: PageProps<"/security/users">) {
  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts that can sign in to the ERP."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Users" }]}
        actions={
          <LinkButton href="/security/users/new">
            <Plus className="size-4" aria-hidden /> New user
          </LinkButton>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <UsersList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function UsersList({ searchParams }: Pick<PageProps<"/security/users">, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const offset = parseOffset(query.offset);
  const result = await tryApi(() => securityApi.getUsers(SECURITY_PAGE_SIZE, offset, search));

  return (
    <>
      <CardHeader
        title="All users"
        actions={
          <Form action={basePath} className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <Input name="q" defaultValue={search} placeholder="Search users" className="h-9 w-56 pl-9" aria-label="Search users" />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </Form>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} notFoundHint={<SecurityEndpointHint endpoint="GET /api/security/users" />} />
      ) : result.data.length === 0 && offset === 0 ? (
        <EmptyState icon={Users} title={search ? `No users match “${search}”` : "No users yet"} />
      ) : (
        <>
          <UsersTable users={result.data} />
          <Pagination basePath={basePath} query={{ q: search }} offset={offset} limit={SECURITY_PAGE_SIZE} count={result.data.length} />
        </>
      )}
    </>
  );
}
