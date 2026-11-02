import { notFound, redirect } from "next/navigation";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { PageHeader } from "@/core/ui/page-header";
import { canManageAccounting, canPostVouchers } from "../access";
import { saveVoucherAction } from "../actions/vouchers";
import { accountingApi } from "../api";
import { editorInitialFrom, loadVoucherEditorOptions, loadVoucherOrganizations } from "../editor-data";
import { VoucherEditor } from "./voucher-editor";

// The New and Edit voucher screens, shared by the full pages (/accounting/vouchers/new, /[id]/edit) and the
// popups that open over the list or the voucher (@modal/(.)new, @modal/(.)[voucherId]/edit). In a popup,
// `returnTo` is where saving lands; on the full page saving opens the voucher.

/** ?type= (a Voucher Type lookup id) starts a voucher of that type; Journal Voucher by default. */
export async function NewVoucherScreen({ type, returnTo }: { type?: string; returnTo?: string }) {
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
      canPost={canPostVouchers(session)}
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
      returnTo={returnTo}
    />
  );
}

/** A draft's editor; the full page (no `returnTo`) also shows the page header with the voucher's number. */
export async function EditVoucherScreen({ id, notice, returnTo }: { id: number; notice?: string; returnTo?: string }) {
  const [session, voucher, options] = await Promise.all([
    requireSession(),
    tryApi(() => accountingApi.vouchers.get(id)),
    loadVoucherEditorOptions(),
  ]);
  if (!voucher.ok) {
    if (voucher.error.status === 404) notFound();
    return <Card><ApiErrorState error={voucher.error} /></Card>;
  }
  // Posted and cancelled vouchers aren't edited (unpost a posted one first).
  if (voucher.data.status !== "Draft" || !canManageAccounting(session)) redirect(`/accounting/vouchers/${id}`);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  const data = voucher.data;
  const { organizations } = await loadVoucherOrganizations(options.data.parties);
  return (
    <>
      {!returnTo && (
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
      )}
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
        canPost={canPostVouchers(session)}
        initial={editorInitialFrom(data)}
        cancelHref={`/accounting/vouchers/${id}`}
        returnTo={returnTo}
      />
    </>
  );
}
