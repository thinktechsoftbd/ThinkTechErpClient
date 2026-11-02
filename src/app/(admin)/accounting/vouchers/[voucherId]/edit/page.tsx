import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { EditVoucherScreen } from "@/modules/accounting/components/voucher-editor-screens";

export const metadata: Metadata = { title: "Edit Voucher" };

type Props = PageProps<"/accounting/vouchers/[voucherId]/edit">;

/** The full page, for a refresh or a shared link; from the list or the voucher it opens in a popup instead. */
export default function EditVoucherPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditVoucher params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditVoucher({ params, searchParams }: Props) {
  const id = parseIdParam((await params).voucherId);
  if (id === null) notFound();
  return <EditVoucherScreen id={id} notice={firstParam((await searchParams).notice)} />;
}
