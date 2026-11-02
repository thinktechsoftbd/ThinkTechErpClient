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
import { loadVoucherEditorOptions, loadVoucherOrganizations } from "@/modules/accounting/editor-data";

export const metadata: Metadata = { title: "New Voucher" };

type Props = PageProps<"/accounting/vouchers/new">;

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

/** ?type= (a Voucher Type lookup id) starts a voucher of that type; Journal Voucher by default. */
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
  if (options.data.headCount === 0) {
    return (
      <Alert tone="warning" title="No ledger heads yet">
        <p>Vouchers post to sub classes (ledger heads). Add one under a map class in the chart of accounts first.</p>
        <LinkButton href="/accounting/chart-of-accounts" variant="outline" size="sm" className="mt-3">
          Chart of accounts
        </LinkButton>
      </Alert>
    );
  }

  if (!options.data.voucherTypes.some((voucherType) => voucherType.isActive)) {
    return (
      <Alert tone="warning" title="No voucher types yet">
        <p>Vouchers take their type from the Voucher Type lookup list. Add the types under Settings → Lookup Data first.</p>
        <LinkButton href="/settings/lookup-data" variant="outline" size="sm" className="mt-3">
          Lookup data
        </LinkButton>
      </Alert>
    );
  }

  const { organizations, currentId } = await loadVoucherOrganizations(options.data.parties);
  const voucherTypeId = options.data.voucherTypes.find((voucherType) => voucherType.isActive && String(voucherType.id) === type)?.id;
  return (
    <VoucherEditor
      action={saveVoucherAction.bind(null, null)}
      parties={options.data.parties}
      currencies={options.data.currencies}
      voucherTypes={options.data.voucherTypes}
      paymentMethods={options.data.paymentMethods}
      organizations={organizations}
      initial={{
        organizationId: currentId,
        voucherRefNo: "",
        voucherTypeId: voucherTypeId ? String(voucherTypeId) : "",
        voucherDate: "",
        paymentMethodId: "",
        chequeNo: "",
        chequeDate: "",
        payType: "",
        narration: "",
        lines: [],
      }}
      cancelHref="/accounting/vouchers"
    />
  );
}
