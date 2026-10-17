import type { Metadata } from "next";
import { KeyRound, Users } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { SUPER_ADMIN_ROLE } from "@/core/auth/roles";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { Skeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { modules } from "@/modules/registry";
import { securityApi } from "@/modules/security/api";

export const metadata: Metadata = { title: "Security" };

export default function SecurityOverviewPage() {
  return (
    <>
      <PageHeader
        title="Security"
        description="Manage who can sign in and what each role can access."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security" }]}
        actions={
          <>
            <LinkButton href="/security/roles" variant="outline">
              <KeyRound className="size-4" aria-hidden /> Roles
            </LinkButton>
            <LinkButton href="/security/users">
              <Users className="size-4" aria-hidden /> Users
            </LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Module access"
            description={`Roles each module requires. "${SUPER_ADMIN_ROLE}" can access every module.`}
          />
          <Table>
            <THead>
              <tr>
                <TH>Module</TH>
                <TH>Status</TH>
                <TH>Required roles</TH>
                <TH className="text-right">Permissions</TH>
              </tr>
            </THead>
            <TBody>
              {modules.map((module) => (
                <TR key={module.key}>
                  <TD>
                    <span className="flex items-center gap-2 font-medium text-gray-800 dark:text-white/90">
                      <module.icon className="size-4 text-gray-500" aria-hidden /> {module.name}
                    </span>
                  </TD>
                  <TD>{module.status === "active" ? <Badge tone="success">Active</Badge> : <Badge>Planned</Badge>}</TD>
                  <TD>
                    <span className="flex flex-wrap gap-1">
                      {module.roles?.length ? (
                        module.roles.map((role) => (
                          <Badge key={role} tone="brand">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Any signed-in user</span>
                      )}
                    </span>
                  </TD>
                  <TD className="text-right">{module.permissions.length}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Security API status" description="Endpoints this module calls on ThinkTechErpAPI." />
          <Suspense
            fallback={
              <div className="space-y-3 p-6">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            }
          >
            <EndpointStatus />
          </Suspense>
        </Card>
      </div>
    </>
  );
}

async function EndpointStatus() {
  const [users, roles] = await Promise.all([
    tryApi(() => securityApi.getUsers(1, 0)),
    tryApi(() => securityApi.getRoles()),
  ]);
  const checks = [
    { label: "GET /api/security/users", result: users },
    { label: "GET /api/security/roles", result: roles },
  ];

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {checks.map(({ label, result }) => (
        <li key={label} className="flex items-center justify-between gap-3 px-6 py-4">
          <code className="font-mono text-xs text-gray-700 dark:text-gray-300">{label}</code>
          {result.ok ? (
            <Badge tone="success">Available</Badge>
          ) : result.error.status === 404 ? (
            <Badge tone="warning">Not implemented</Badge>
          ) : (
            <Badge tone="error">{result.error.status ? `Error ${result.error.status}` : "Unreachable"}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
