import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { canManageAccounting } from "@/modules/accounting/access";
import { saveVoucherAction } from "@/modules/accounting/actions/vouchers";
import { accountingApi } from "@/modules/accounting/api";
import { VoucherEditor } from "@/modules/accounting/components/voucher-editor";
import { editorInitialFrom, loadVoucherEditorOptions, loadVoucherOrganizations } from "@/modules/accounting/editor-data";

export const metadata: Metadata = { title: "Edit Voucher" };

type Props = PageProps<"/accounting/vouchers/[voucherId]/edit">;

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
  const notice = firstParam((await searchParams).notice);
  const [session, voucher, options] = await Promise.all([
    requireSession(),
    tryApi(() => accountingApi.vouchers.get(id)),
    loadVoucherEditorOptions(),
  ]);
  if (!voucher.ok) {
    if (voucher.error.status === 404) notFound();
    return <Card><ApiErrorState error={voucher.error} /></Card>;
  }
  // Posted and cancelled vouchers aren't edited (bill payments and collections are posted at once).
  if (voucher.data.status !== "Draft" || !canManageAccounting(session)) redirect(`/accounting/vouchers/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  const data = voucher.data;
  const { organizations } = await loadVoucherOrganizations(options.data.parties);
  return (
    <>
      <PageHeader
        title={`Edit ${data.voucherRefNo}`}
        description="A draft: nothing is in the ledgers yet. Post it once debits equal credits."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounting", href: "/accounting" },
          { label: "Vouchers", href: "/accounting/vouchers" },
          { label: data.voucherRefNo, href: `/accounting/vouchers/${id}` },
          { label: "Edit" },
        ]}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <VoucherEditor
        action={saveVoucherAction.bind(null, id)}
        parties={options.data.parties}
        currencies={options.data.currencies}
        voucherTypes={options.data.voucherTypes}
        paymentMethods={options.data.paymentMethods}
        organizations={organizations}
        lockOrganization
        initial={editorInitialFrom(data)}
        cancelHref={`/accounting/vouchers/${id}`}
      />
    </>
  );
}
