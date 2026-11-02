import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { firstParam } from "@/core/ui/pagination";
import { RouteModal } from "@/core/ui/route-modal";
import { parseIdParam } from "@/core/utils/params";
import { EditVoucherScreen } from "@/modules/accounting/components/voucher-editor-screens";

type Props = PageProps<"/accounting/vouchers/[voucherId]/edit">;

/**
 * Edit a draft in a popup over the list (?from=list, saving returns to the list) or over the voucher's page
 * (saving returns to the voucher).
 */
export default function EditVoucherModal({ params, searchParams }: Props) {
  return (
    <RouteModal title="Edit voucher" description="A draft: nothing is in the ledgers yet. Post it once debits equal credits.">
      <Suspense fallback={<TableSkeleton rows={6} columns={4} />}>
        <EditVoucher params={params} searchParams={searchParams} />
      </Suspense>
    </RouteModal>
  );
}

async function EditVoucher({ params, searchParams }: Props) {
  const id = parseIdParam((await params).voucherId);
  if (id === null) notFound();
  const query = await searchParams;
  const returnTo = firstParam(query.from) === "list" ? "/accounting/vouchers" : `/accounting/vouchers/${id}`;
  return <EditVoucherScreen id={id} notice={firstParam(query.notice)} returnTo={returnTo} />;
}
