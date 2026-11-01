import type { Metadata } from "next";
import { NotebookPen, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { Input } from "@/core/forms/fields";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { accountingApi } from "@/modules/accounting/api";
import { VoucherTable } from "@/modules/accounting/components/voucher-table";
import { ACCOUNTING_MANAGE_PERMISSION, VOUCHER_STATUSES, VOUCHER_TYPES, accountingLabel } from "@/modules/accounting/types";
import { dateParam } from "@/modules/inventory/components/reports/report-parts";

export const metadata: Metadata = { title: "Vouchers" };

const basePath = "/accounting/vouchers";
type Props = PageProps<"/accounting/vouchers">;

const TYPE_OPTIONS = VOUCHER_TYPES.map((type) => ({ value: type, label: accountingLabel(type) }));
const STATUS_OPTIONS = VOUCHER_STATUSES.map((status) => ({ value: status, label: status }));

export default function VouchersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Journal, payment, receipt and contra vouchers, with the bill payments and collections. Drafts can be edited; posted vouchers are in the ledgers."
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
    </>
  );
}

async function VoucherList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const typeParam = firstParam(query.type);
  const voucherType = TYPE_OPTIONS.some((option) => option.value === typeParam) ? typeParam : undefined;
  const statusParam = firstParam(query.status);
  const status = STATUS_OPTIONS.some((option) => option.value === statusParam) ? statusParam : undefined;
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const result = await tryApi(() =>
    accountingApi.vouchers.list({ search, voucherType, status, from, to, limit: CRUD_PAGE_SIZE, offset }),
  );
  const filtered = Boolean(search || voucherType || status || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} voucher(s)` : "Vouchers"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="No, narration, reference" filtered={filtered}>
            <FilterSelect name="type" label="Type" value={voucherType} options={TYPE_OPTIONS} allLabel="All types" className="w-40" />
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-32" />
            <div className="w-36">
              <Input type="date" name="from" defaultValue={from} aria-label="From date" title="From date" className="h-9 px-3" />
            </div>
            <div className="w-36">
              <Input type="date" name="to" defaultValue={to} aria-label="To date" title="To date" className="h-9 px-3" />
            </div>
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={filtered ? "No vouchers match these filters" : "No vouchers yet"}
          description={filtered ? undefined : "Enter a voucher to post debits and credits to the ledger heads."}
        />
      ) : (
        <>
          <VoucherTable vouchers={result.data.items} />
          <Pagination
            basePath={basePath}
            query={{ q: search, type: voucherType, status, from, to }}
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
