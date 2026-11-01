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
import { editorInitialFrom, loadVoucherEditorOptions } from "@/modules/accounting/editor-data";
import { GENERAL_VOUCHER_TYPES } from "@/modules/accounting/types";

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
  // Posted, cancelled and bill vouchers aren't edited.
  if (
    voucher.data.status !== "Draft" ||
    !(GENERAL_VOUCHER_TYPES as readonly string[]).includes(voucher.data.voucherType) ||
    !canManageAccounting(session)
  )
    redirect(`/accounting/vouchers/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  const data = voucher.data;
  return (
    <>
      <PageHeader
        title={`Edit ${data.voucherNo}`}
        description="A draft: nothing is in the ledgers yet. Post it once debits equal credits."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounting", href: "/accounting" },
          { label: "Vouchers", href: "/accounting/vouchers" },
          { label: data.voucherNo, href: `/accounting/vouchers/${id}` },
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
        heads={options.data.heads}
        suppliers={options.data.suppliers}
        customers={options.data.customers}
        initial={editorInitialFrom(data)}
        cancelHref={`/accounting/vouchers/${id}`}
      />
    </>
  );
}
