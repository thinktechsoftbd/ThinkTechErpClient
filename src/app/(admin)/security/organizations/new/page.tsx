import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageHeader } from "@/core/ui/page-header";
import { OrganizationForm } from "@/modules/security/components/forms";

export const metadata: Metadata = { title: "New organization" };

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
          <OrganizationForm />
        </CardBody>
      </Card>
    </>
  );
}
