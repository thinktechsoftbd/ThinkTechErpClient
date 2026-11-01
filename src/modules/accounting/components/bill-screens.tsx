import { BanknoteArrowUp, HandCoins, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { Input } from "@/core/forms/fields";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, PageSkeleton, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { dateParam, idParam } from "@/modules/inventory/components/reports/report-parts";
import { canManageAccounting } from "../access";
import { createBillCollectionAction, createBillPaymentAction } from "../actions/vouchers";
import { accountingApi } from "../api";
import { loadVoucherEditorOptions } from "../editor-data";
import { getParties } from "../queries";
import { ACCOUNTING_MANAGE_PERMISSION } from "../types";
import { BillForm } from "./bill-form";
import { partyLabel } from "./pickers";
import { VoucherTable } from "./voucher-table";

// The Supplier Bill Payment and Customer Bill Collection screens: the same list and form,
// one for each side.

export type BillKind = "payment" | "collection";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const screens = {
  payment: {
    title: "Supplier Bill Payment",
    crumb: "Bill Payment",
    basePath: "/accounting/bill-payments",
    description: "Money paid to suppliers: debits the supplier's payable head, credits the cash or bank head, posted at once.",
    party: "Supplier" as const,
    partyParam: "supplier",
    icon: BanknoteArrowUp,
    newLabel: "New payment",
  },
  collection: {
    title: "Customer Bill Collection",
    crumb: "Bill Collection",
    basePath: "/accounting/bill-collections",
    description: "Money collected from customers: debits the cash or bank head, credits the customer's receivable head, posted at once.",
    party: "Customer" as const,
    partyParam: "customer",
    icon: HandCoins,
    newLabel: "New collection",
  },
};

const STATUS_OPTIONS = [
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

export function BillListScreen({ kind, searchParams }: { kind: BillKind; searchParams: SearchParams }) {
  const screen = screens[kind];
  return (
    <>
      <PageHeader
        title={screen.title}
        description={screen.description}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting", href: "/accounting" }, { label: screen.crumb }]}
        actions={
          <Suspense>
            <PermissionOnly code={ACCOUNTING_MANAGE_PERMISSION}>
              <LinkButton href={`${screen.basePath}/new`}>
                <Plus className="size-4" aria-hidden /> {screen.newLabel}
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={5} />}>
          <BillList kind={kind} searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function BillList({ kind, searchParams }: { kind: BillKind; searchParams: SearchParams }) {
  const screen = screens[kind];
  const query = await searchParams;
  const search = firstParam(query.q);
  const partyId = idParam(query[screen.partyParam]);
  const statusParam = firstParam(query.status);
  const status = STATUS_OPTIONS.some((option) => option.value === statusParam) ? statusParam : undefined;
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const list = kind === "payment" ? accountingApi.billPayments.list : accountingApi.billCollections.list;
  const [parties, result] = await Promise.all([
    getParties(screen.party),
    tryApi(() =>
      list({
        search,
        status,
        from,
        to,
        supplierId: kind === "payment" ? partyId : undefined,
        customerId: kind === "collection" ? partyId : undefined,
        limit: CRUD_PAGE_SIZE,
        offset,
      }),
    ),
  ]);
  const filtered = Boolean(search || partyId || status || from || to);
  const word = kind === "payment" ? "payment" : "collection";

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} ${word}(s)` : screen.crumb}
        actions={
          <ListToolbar basePath={screen.basePath} search={search} placeholder="No, narration, reference" filtered={filtered}>
            <FilterSelect
              name={screen.partyParam}
              label={screen.party}
              value={partyId ? String(partyId) : undefined}
              options={(parties.ok ? parties.data : []).map((party) => ({ value: String(party.id), label: partyLabel(party) }))}
              allLabel={`All ${screen.party.toLowerCase()}s`}
              className="w-48"
            />
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
          icon={screen.icon}
          title={filtered ? `No ${word}s match these filters` : `No bill ${word}s yet`}
          description={
            filtered
              ? undefined
              : kind === "payment"
                ? "Record a payment to a supplier from a cash or bank head."
                : "Record money collected from a customer into a cash or bank head."
          }
        />
      ) : (
        <>
          <VoucherTable vouchers={result.data.items} showType={false} />
          <Pagination
            basePath={screen.basePath}
            query={{ q: search, [screen.partyParam]: partyId, status, from, to }}
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

export function NewBillScreen({ kind, searchParams }: { kind: BillKind; searchParams: SearchParams }) {
  const screen = screens[kind];
  return (
    <>
      <PageHeader
        title={kind === "payment" ? "New supplier bill payment" : "New customer bill collection"}
        description={screen.description}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounting", href: "/accounting" },
          { label: screen.crumb, href: screen.basePath },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewBill kind={kind} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** ?supplier= (or ?customer=) preselects the party. */
async function NewBill({ kind, searchParams }: { kind: BillKind; searchParams: SearchParams }) {
  const screen = screens[kind];
  const partyId = idParam((await searchParams)[screen.partyParam]);
  const [session, options] = await Promise.all([requireSession(), loadVoucherEditorOptions()]);
  if (!canManageAccounting(session)) {
    return (
      <Alert tone="warning" title={`You can't record bill ${kind === "payment" ? "payments" : "collections"}`}>
        <p>This needs the accounting manage permission.</p>
        <LinkButton href={screen.basePath} variant="outline" size="sm" className="mt-3">
          Back
        </LinkButton>
      </Alert>
    );
  }
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  const parties = kind === "payment" ? options.data.suppliers : options.data.customers;
  return (
    <BillForm
      kind={kind}
      action={kind === "payment" ? createBillPaymentAction : createBillCollectionAction}
      parties={parties}
      partyHeads={options.data.heads.filter((head) => head.partyType === screen.party)}
      cashHeads={options.data.heads.filter((head) => head.ledgerType === "Cash" || head.ledgerType === "Bank")}
      initialPartyId={partyId && parties.some((party) => party.id === partyId) ? partyId : null}
      cancelHref={screen.basePath}
    />
  );
}
