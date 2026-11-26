import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { EditServiceInvoiceScreen } from "@/modules/warranty/components/edit-service-invoice-screen";

export const metadata: Metadata = { title: "Edit Service Invoice" };

type Props = PageProps<"/warranty/service-invoices/[invoiceId]/edit">;

/** A draft's editor on its own page (a refresh or shared link; from the list it opens in a popup). */
export default function EditServiceInvoicePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditServiceInvoice params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditServiceInvoice({ params, searchParams }: Props) {
  const id = parseIdParam((await params).invoiceId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  return <EditServiceInvoiceScreen id={id} notice={notice} />;
}
