import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageHeader } from "@/core/ui/page-header";
import { PermissionForm } from "@/modules/security/components/forms";

export const metadata: Metadata = { title: "New permission" };

export default function NewPermissionPage() {
  return (
    <>
      <PageHeader
        title="New permission"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Permissions", href: "/security/permissions" },
          { label: "New" },
        ]}
      />
      <Card className="max-w-3xl">
        <CardHeader title="Permission" />
        <CardBody>
          <PermissionForm />
        </CardBody>
      </Card>
    </>
  );
}
