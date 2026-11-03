import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { canManageAccounting, canPostVouchers } from "@/modules/accounting/access";
import { accountingApi } from "@/modules/accounting/api";
import { VoucherActions, VoucherDetails, VoucherTitle, voucherSubtitle } from "@/modules/accounting/components/voucher-view";
import { PrintButton } from "@/modules/inventory/components/reports/print-button";

export const metadata: Metadata = { title: "Voucher" };

type Props = PageProps<"/accounting/vouchers/[voucherId]">;

/** A voucher's own page (a refresh, a shared link, or a link from a ledger); from the list it opens in a popup. */
export default function VoucherPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VoucherDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function VoucherDetail({ params, searchParams }: Props) {
  const id = parseIdParam((await params).voucherId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, result] = await Promise.all([requireSession(), tryApi(() => accountingApi.vouchers.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const voucher = result.data;
  return (
    <>
      <PageHeader
        title={<VoucherTitle voucher={voucher} />}
        description={voucherSubtitle(voucher)}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounting", href: "/accounting" },
          { label: "Vouchers", href: "/accounting/vouchers" },
          { label: voucher.voucherRefNo },
        ]}
        actions={
          <div className="flex flex-wrap items-start gap-2 print:hidden">
            <LinkButton href="/accounting/vouchers" variant="outline" size="sm">
              <ArrowLeft className="size-4" aria-hidden /> Back to list
            </LinkButton>
            <PrintButton />
            <VoucherActions
              voucher={voucher}
              canManage={canManageAccounting(session)}
              canPost={canPostVouchers(session)}
              editHref={`/accounting/vouchers/${id}/edit`}
            />
          </div>
        }
      />

      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}

      <VoucherDetails voucher={voucher} />
    </>
  );
}
