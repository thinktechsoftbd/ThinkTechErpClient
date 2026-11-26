import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { firstParam } from "@/core/ui/pagination";
import { RouteModal } from "@/core/ui/route-modal";
import { parseIdParam } from "@/core/utils/params";
import { EditServiceInvoiceScreen } from "@/modules/warranty/components/edit-service-invoice-screen";

type Props = PageProps<"/warranty/service-invoices/[invoiceId]/edit">;

/** A draft service invoice's editor in a popup over the list; saving returns to the list. */
export default function EditServiceInvoiceModal({ params, searchParams }: Props) {
  return (
    <RouteModal title="Edit service invoice" description="A draft: change the work, the service amount, the parts used or the payment.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <EditServiceInvoiceModalBody params={params} searchParams={searchParams} />
      </Suspense>
    </RouteModal>
  );
}

async function EditServiceInvoiceModalBody({ params, searchParams }: Props) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  return <EditServiceInvoiceScreen id={id} notice={notice} returnTo="/warranty/service-invoices" />;
}
