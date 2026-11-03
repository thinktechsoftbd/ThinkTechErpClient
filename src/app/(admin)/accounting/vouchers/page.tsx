import type { Metadata } from "next";
import { Building2, NotebookPen, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { Input } from "@/core/forms/fields";
import { requireSession } from "@/core/auth/session";
import { getCurrentOrganization } from "@/core/org/organization";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageAccounting, canPostVouchers } from "@/modules/accounting/access";
import { accountingApi } from "@/modules/accounting/api";
import { VoucherTable } from "@/modules/accounting/components/voucher-table";
import { VoucherViewModal } from "@/modules/accounting/components/voucher-view";
import { getVoucherTypes } from "@/modules/accounting/queries";
import { ACCOUNTING_MANAGE_PERMISSION, VOUCHER_STATUSES } from "@/modules/accounting/types";
import { dateParam, idParam } from "@/modules/inventory/components/reports/report-parts";

export const metadata: Metadata = { title: "Vouchers" };

const basePath = "/accounting/vouchers";
type Props = PageProps<"/accounting/vouchers">;

const STATUS_OPTIONS = VOUCHER_STATUSES.map((status) => ({ value: status, label: status }));

export default function VouchersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Vouchers of every type, the bill payments and collections included. Drafts can be edited; posted vouchers are in the ledgers."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting", href: "/accounting" }, { label: "Vouchers" }]}
        actions={
          <Suspense>
            <PermissionOnly code={ACCOUNTING_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New voucher
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <VoucherList searchParams={searchParams} />
        </Suspense>
      </Card>
      <Suspense>
        <VoucherPopup searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Query = Awaited<Props["searchParams"]>;

/** The list's own parameters (search, filters, page) as they are in the address, without the popup's. */
function listParams(query: Query) {
  const params = new URLSearchParams();
  for (const key of ["q", "type", "status", "from", "to", "offset"]) {
    const value = firstParam(query[key]);
    if (value) params.set(key, value);
  }
  return params;
}

/** A voucher clicked in the list (`?view=<id>`) opens in a popup over it; closing it keeps the list as it was. */
async function VoucherPopup({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const id = idParam(query.view);
  if (!id) return null;
  const params = listParams(query);
  return <VoucherViewModal id={id} closeHref={params.size ? `${basePath}?${params}` : basePath} />;
}

async function VoucherList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const viewHref = (id: number) => {
    const params = listParams(query);
    params.set("view", String(id));
    return `${basePath}?${params}`;
  };
  const search = firstParam(query.q);
  const voucherTypeId = idParam(query.type);
  const statusParam = firstParam(query.status);
  const status = STATUS_OPTIONS.some((option) => option.value === statusParam) ? statusParam : undefined;
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [types, result, organization, session] = await Promise.all([
    getVoucherTypes(),
    tryApi(() => accountingApi.vouchers.list({ search, voucherTypeId, status, from, to, limit: CRUD_PAGE_SIZE, offset })),
    getCurrentOrganization(),
    requireSession(),
  ]);
  const typeOptions = (types.ok ? types.data : []).map((type) => ({ value: String(type.id), label: type.name }));
  const filtered = Boolean(search || voucherTypeId || status || from || to);
  // The list is the header's organization only; naming it explains an empty list when the vouchers are in another.
  const inOrganization = organization ? ` in ${organization.name}` : "";

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} voucher(s)` : "Vouchers"}
        description={
          organization && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" aria-hidden /> {organization.name}
            </span>
          )
        }
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Ref. no, cheque no, party, narration" filtered={filtered}>
            <FilterSelect
              name="type"
              label="Type"
              value={voucherTypeId ? String(voucherTypeId) : undefined}
              options={typeOptions}
              allLabel="All types"
              className="w-52"
            />
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-32" />
            <div className="w-36">
              <Input key={from ?? ""} type="date" name="from" defaultValue={from} aria-label="From date" title="From date" className="h-9 px-3" />
            </div>
            <div className="w-36">
              <Input key={to ?? ""} type="date" name="to" defaultValue={to} aria-label="To date" title="To date" className="h-9 px-3" />
            </div>
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={filtered ? `No vouchers${inOrganization} match these filters` : `No vouchers${inOrganization} yet`}
          description={
            filtered
              ? undefined
              : `Enter a voucher to post debits and credits to the ledger heads.${organization ? " Vouchers of another organization show when you switch to it at the top of the page." : ""}`
          }
        />
      ) : (
        <>
          <VoucherTable
            vouchers={result.data.items}
            manage={{ canManage: canManageAccounting(session), canPost: canPostVouchers(session) }}
            viewHref={viewHref}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, type: voucherTypeId, status, from, to }}
            offset={offset}
            limit={CRUD_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
