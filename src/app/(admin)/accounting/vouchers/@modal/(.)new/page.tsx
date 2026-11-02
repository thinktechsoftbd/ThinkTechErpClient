import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { firstParam } from "@/core/ui/pagination";
import { RouteModal } from "@/core/ui/route-modal";
import { NewVoucherScreen } from "@/modules/accounting/components/voucher-editor-screens";

type Props = PageProps<"/accounting/vouchers/new">;

/** New voucher in a popup over the list; saving returns to the list. */
export default function NewVoucherModal({ searchParams }: Props) {
  return (
    <RouteModal
      title="New voucher"
      description="Choose the voucher type, then debit and credit ledger heads. Save it as a draft, or post it once debits equal credits."
    >
      <Suspense fallback={<TableSkeleton rows={6} columns={4} />}>
        <NewVoucher searchParams={searchParams} />
      </Suspense>
    </RouteModal>
  );
}

async function NewVoucher({ searchParams }: Pick<Props, "searchParams">) {
  return <NewVoucherScreen type={firstParam((await searchParams).type)} returnTo="/accounting/vouchers" />;
}
