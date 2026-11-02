import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { NewVoucherScreen } from "@/modules/accounting/components/voucher-editor-screens";

export const metadata: Metadata = { title: "New Voucher" };

type Props = PageProps<"/accounting/vouchers/new">;

/** The full page, for a refresh or a shared link; from the list the same screen opens in a popup (@modal/(.)new). */
export default function NewVoucherPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New voucher"
        description="Choose the organization and voucher type, then debit and credit ledger heads. Save it as a draft, or post it to the ledgers once debits equal credits."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounting", href: "/accounting" },
          { label: "Vouchers", href: "/accounting/vouchers" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewVoucher searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewVoucher({ searchParams }: Pick<Props, "searchParams">) {
  return <NewVoucherScreen type={firstParam((await searchParams).type)} />;
}
