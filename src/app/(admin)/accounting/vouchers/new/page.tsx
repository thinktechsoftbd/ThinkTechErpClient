import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { canManageAccounting } from "@/modules/accounting/access";
import { saveVoucherAction } from "@/modules/accounting/actions/vouchers";
import { VoucherEditor } from "@/modules/accounting/components/voucher-editor";
import { loadVoucherEditorOptions } from "@/modules/accounting/editor-data";
import { GENERAL_VOUCHER_TYPES, type GeneralVoucherType } from "@/modules/accounting/types";

export const metadata: Metadata = { title: "New Voucher" };

type Props = PageProps<"/accounting/vouchers/new">;

export default function NewVoucherPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New voucher"
        description="Debit and credit ledger heads. Save it as a draft, or post it to the ledgers once debits equal credits."
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

/** ?type=Payment starts a payment voucher (Journal by default). */
async function NewVoucher({ searchParams }: Pick<Props, "searchParams">) {
  const type = firstParam((await searchParams).type);
  const [session, options] = await Promise.all([requireSession(), loadVoucherEditorOptions()]);
  if (!canManageAccounting(session)) {
    return (
      <Alert tone="warning" title="You can't enter vouchers">
        <p>Entering vouchers needs the accounting manage permission.</p>
        <LinkButton href="/accounting/vouchers" variant="outline" size="sm" className="mt-3">
          Back to vouchers
        </LinkButton>
      </Alert>
    );
  }
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  if (options.data.heads.length === 0) {
    return (
      <Alert tone="warning" title="No ledger heads yet">
        <p>Vouchers post to sub classes (ledger heads). Add one under a map class in the chart of accounts first.</p>
        <LinkButton href="/accounting/chart-of-accounts" variant="outline" size="sm" className="mt-3">
          Chart of accounts
        </LinkButton>
      </Alert>
    );
  }

  const voucherType = (GENERAL_VOUCHER_TYPES as readonly string[]).includes(type ?? "") ? (type as GeneralVoucherType) : "Journal";
  return (
    <VoucherEditor
      action={saveVoucherAction.bind(null, null)}
      heads={options.data.heads}
      parties={options.data.parties}
      currencies={options.data.currencies}
      initial={{ voucherType, voucherDate: "", referenceNo: "", narration: "", lines: [] }}
      cancelHref="/accounting/vouchers"
    />
  );
}
