import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageHeader } from "@/core/ui/page-header";
import { RoleForm } from "@/modules/security/components/forms";

export const metadata: Metadata = { title: "New role" };

export default function NewRolePage() {
  return (
    <>
      <PageHeader
        title="New role"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Roles", href: "/security/roles" },
          { label: "New" },
        ]}
      />
      <Card>
        <CardHeader title="Role" description="Permissions are grouped by module, as declared in each module's definition." />
        <CardBody>
          <RoleForm />
        </CardBody>
      </Card>
    </>
  );
}
