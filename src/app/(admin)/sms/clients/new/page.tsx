import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageHeader } from "@/core/ui/page-header";
import { ClientCreateForm } from "@/modules/sms/components/forms";

export const metadata: Metadata = { title: "New SMS client" };

export default function NewSmsClientPage() {
  return (
    <>
      <PageHeader
        title="New SMS client"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SMS", href: "/sms" },
          { label: "Clients", href: "/sms/clients" },
          { label: "New" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader title="Client details" description="The client starts with a zero balance." />
        <CardBody>
          <ClientCreateForm />
        </CardBody>
      </Card>
    </>
  );
}
