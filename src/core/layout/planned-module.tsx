import { Construction } from "lucide-react";
import { Suspense } from "react";
import type { ModuleDefinition } from "@/core/modules/types";
import { Badge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { EmptyState, PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { ModuleGate } from "./session-parts";

/** Placeholder page for a registered module whose screens aren't built yet. */
export function PlannedModule({ module }: { module: ModuleDefinition }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={module}>
        <PageHeader
          title={module.name}
          description={module.description}
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: module.name }]}
        />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <EmptyState
              icon={Construction}
              title={`${module.name} is coming soon`}
              description="This module is registered in the shell (navigation, roles and permissions) and is ready for its screens and API client."
            />
          </Card>
          <Card>
            <CardHeader title="Planned permissions" />
            <CardBody className="space-y-2">
              {module.permissions.map((permission) => (
                <div key={permission.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{permission.label}</span>
                  <Badge>{permission.key}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </ModuleGate>
    </Suspense>
  );
}
