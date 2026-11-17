import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
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
import { DateRangeFilter, readDocumentFilters } from "@/modules/inventory/components/documents/list-filters";
import { canManageWarranty } from "@/modules/warranty/access";
import { createCardAction } from "@/modules/warranty/actions/cards";
import { warrantyApi } from "@/modules/warranty/api";
import { ManualCardFields } from "@/modules/warranty/components/card-fields";
import { CardsTable } from "@/modules/warranty/components/cards-table";
import { DeskTabs } from "@/modules/warranty/components/desk-tabs";
import { getPolicyOptions } from "@/modules/warranty/queries";
import { CARD_SOURCES, CARD_STATUSES, COVERAGES, WARRANTY_MANAGE_PERMISSION, warrantyLabel } from "@/modules/warranty/types";

export const metadata: Metadata = { title: "Warranty cards" };

const basePath = "/warranty/service/cards";
type Props = PageProps<"/warranty/service/cards">;

const options = (values: readonly string[]) => values.map((value) => ({ value, label: warrantyLabel(value) }));

export default function WarrantyCardsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Warranty & Service"
        description="A card for every unit sold with a warranty, issued when the sale is completed. Register older sales by hand."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty/service" }, { label: "Warranty cards" }]}
        actions={
          <Suspense>
            <PermissionOnly code={WARRANTY_MANAGE_PERMISSION}>
              <NewCardButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <DeskTabs active="cards" />
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <CardList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewCardButton() {
  const policies = await getPolicyOptions();
  return (
    <FormModalButton
      mode="create"
      label="Register card"
      title="Register a warranty card"
      description="For a unit sold before the system went live (sales completed here get their cards by themselves)."
      action={createCardAction}
      submitLabel="Register"
      size="lg"
    >
      <ManualCardFields policies={policies.ok ? policies.data : []} />
    </FormModalButton>
  );
}

async function CardList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const { search, status, from, to, offset } = readDocumentFilters(query);
  const coverage = firstParam(query.coverage);
  const source = firstParam(query.source);
  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => warrantyApi.cards.list({ search, status, coverage, source, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || coverage || source || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} card(s)` : "Warranty cards"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Card, serial, customer, mobile, invoice" filtered={filtered}>
            <FilterSelect name="coverage" label="Today" value={coverage} options={options(COVERAGES)} allLabel="Any cover" className="w-44" />
            <FilterSelect name="status" label="Status" value={status} options={options(CARD_STATUSES)} allLabel="All statuses" className="w-32" />
            <FilterSelect name="source" label="Source" value={source} options={options(CARD_SOURCES)} allLabel="All sources" className="w-36" />
            <DateRangeFilter from={from} to={to} />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={filtered ? "No cards match these filters" : "No warranty cards yet"}
          description={filtered ? undefined : "Give products a warranty policy (Warranty → Product Warranty); completing a sale of them issues the cards."}
        />
      ) : (
        <>
          <CardsTable rows={result.data.items} canManage={canManageWarranty(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, status, coverage, source, from, to }}
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
