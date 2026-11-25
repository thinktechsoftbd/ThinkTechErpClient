import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { Skeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { OrganizationForm } from "@/modules/security/components/forms";
import { getOrganizationSmsProviders } from "@/modules/security/queries";

export const metadata: Metadata = { title: "New organization" };

/** The form, once the SMS providers of its picker are loaded. */
async function NewOrganizationForm() {
  const smsProviders = await getOrganizationSmsProviders();
  return <OrganizationForm smsProviders={smsProviders.ok ? smsProviders.data : []} />;
}

export default function NewOrganizationPage() {
  return (
    <>
      <PageHeader
        title="New organization"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Organizations", href: "/security/organizations" },
          { label: "New" },
        ]}
      />
      <Card className="max-w-4xl">
        <CardHeader title="Organization" />
        <CardBody>
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <NewOrganizationForm />
          </Suspense>
        </CardBody>
      </Card>
    </>
  );
}
