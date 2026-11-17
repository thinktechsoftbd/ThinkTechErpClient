import type { Metadata } from "next";
import { Send } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { DateRangeFilter, readDocumentFilters } from "@/modules/inventory/components/documents/list-filters";
import { canManageWarranty } from "@/modules/warranty/access";
import { createClaimAction } from "@/modules/warranty/actions/claims";
import { warrantyApi } from "@/modules/warranty/api";
import { StockClaimFields } from "@/modules/warranty/components/claim-fields";
import { ClaimsTable } from "@/modules/warranty/components/claims-table";
import { DeskTabs } from "@/modules/warranty/components/desk-tabs";
import { getSupplierOptions } from "@/modules/warranty/queries";
import { WARRANTY_MANAGE_PERMISSION } from "@/modules/warranty/types";

export const metadata: Metadata = { title: "Supplier claims" };

const basePath = "/warranty/service/claims";
type Props = PageProps<"/warranty/service/claims">;

const STATUS_OPTIONS = [
  { value: "Sent", label: "At supplier" },
  { value: "Returned", label: "Returned" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function SupplierClaimsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Warranty & Service"
        description="Faulty units sent to the supplier, distributor or brand service center, and what came back."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty/service" }, { label: "Supplier claims" }]}
        actions={
          <Suspense>
            <PermissionOnly code={WARRANTY_MANAGE_PERMISSION}>
              <NewClaimButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <DeskTabs active="claims" />
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <ClaimList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewClaimButton() {
  const suppliers = await getSupplierOptions();
  return (
    <FormModalButton
      mode="create"
      icon={<Send className="size-4" aria-hidden />}
      label="Claim for stock"
      title="Send faulty stock to the supplier"
      description="For a customer's device, use Send to supplier on its service job instead."
      action={createClaimAction.bind(null, null)}
      submitLabel="Record claim"
      size="lg"
    >
      <StockClaimFields suppliers={suppliers.ok ? suppliers.data : []} />
    </FormModalButton>
  );
}

async function ClaimList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const { search, status, from, to, offset } = readDocumentFilters(query);
  const supplierParam = firstParam(query.supplier);
  const supplierId = supplierParam ? (parseIdParam(supplierParam) ?? undefined) : undefined;
  const [session, result, suppliers] = await Promise.all([
    requireSession(),
    tryApi(() => warrantyApi.claims.list({ search, status, supplierId, from, to, limit: CRUD_PAGE_SIZE, offset })),
    getSupplierOptions(),
  ]);
  const filtered = Boolean(search || status || supplierId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} claim(s)` : "Supplier claims"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Claim, product, serial, job" filtered={filtered}>
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-36" />
            <FilterSelect
              name="supplier"
              label="Supplier"
              value={supplierParam}
              options={(suppliers.ok ? suppliers.data : []).map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All suppliers"
              className="w-44"
            />
            <DateRangeFilter from={from} to={to} />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Send}
          title={filtered ? "No claims match these filters" : "No supplier claims yet"}
          description={filtered ? undefined : "Send a faulty unit to the supplier from its service job, or a stock unit with Claim for stock."}
        />
      ) : (
        <>
          <ClaimsTable rows={result.data.items} canManage={canManageWarranty(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, status, supplier: supplierParam, from, to }}
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
