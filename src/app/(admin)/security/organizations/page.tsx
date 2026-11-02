import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { canAccessModule } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManageOrganizations } from "@/modules/security/access";
import { createOrganizationFromListAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { PermissionOnly } from "@/core/crud/permission-only";
import { OrganizationFields } from "@/modules/security/components/forms";
import { OrganizationsTable } from "@/modules/security/components/tables";
import { ORGANIZATION_MANAGE_PERMISSION } from "@/modules/security/types";
import { smsModule } from "@/modules/sms/module";

export const metadata: Metadata = { title: "Organizations" };

export default function OrganizationsPage() {
  return (
    <>
      <PageHeader
        title="Organizations"
        description="Companies and branches using the ERP."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Organizations" }]}
        actions={
          <Suspense>
            <PermissionOnly code={ORGANIZATION_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New organization"
                title="New organization"
                description="Fill in its details. The Organization Id is generated when left empty."
                action={createOrganizationFromListAction}
                submitLabel="Create organization"
                size="lg"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <OrganizationFields />
                </div>
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <CardHeader title="All organizations" />
        <Suspense fallback={<TableSkeleton />}>
          <OrganizationsList />
        </Suspense>
      </Card>
    </>
  );
}

async function OrganizationsList() {
  const [session, result] = await Promise.all([requireSession(), tryApi(() => securityApi.getOrganizations())]);
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0) return <EmptyState icon={Building2} title="No organizations yet" />;
  // The Allocations links open SMS → Allocations, so only for users who can open the SMS module.
  return (
    <OrganizationsTable
      organizations={result.data}
      canManage={canManageOrganizations(session)}
      smsLinks={canAccessModule(session, smsModule)}
    />
  );
}
