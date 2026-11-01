import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
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
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { getCurrencyOptions } from "@/modules/inventory/queries";
import { canManageSms } from "@/modules/sms/access";
import { savePurchaseAction } from "@/modules/sms/actions/purchases";
import { smsApi } from "@/modules/sms/api";
import { DateRangeFilter, dateParam, idParam } from "@/modules/sms/components/list-filters";
import { PurchaseFields } from "@/modules/sms/components/purchases/purchase-fields";
import { PurchasesTable } from "@/modules/sms/components/purchases/purchases-table";
import { getSmsProviders } from "@/modules/sms/queries";
import { SMS_MANAGE_PERMISSION, providerLabel } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS Purchases" };

const basePath = "/sms/purchases";
type Props = PageProps<"/sms/purchases">;

export default function SmsPurchasesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Purchases"
        description="SMS bought from providers, with the price in the invoice's currency and the cost in BDT."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Purchases" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SMS_MANAGE_PERMISSION}>
              <NewPurchaseButton searchParams={searchParams} />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <PurchaseList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

/** Opens on arrival with ?new=1 (e.g. from the SMS overview). */
async function NewPurchaseButton({ searchParams }: Pick<Props, "searchParams">) {
  const [query, providers, currencies] = await Promise.all([searchParams, getSmsProviders(), getCurrencyOptions()]);
  return (
    <FormModalButton
      mode="create"
      label="Record purchase"
      title="Record purchase"
      action={savePurchaseAction.bind(null, null)}
      submitLabel="Record"
      size="lg"
      defaultOpen={firstParam(query.new) === "1"}
    >
      <PurchaseFields providers={providers.ok ? providers.data : []} currencies={currencies.ok ? currencies.data : []} />
    </FormModalButton>
  );
}

async function PurchaseList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const providerId = idParam(query.provider);
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const session = await requireSession();
  const canManage = canManageSms(session);
  const [providers, currencies, result] = await Promise.all([
    getSmsProviders(),
    // Only the edit modals need the currencies.
    canManage ? getCurrencyOptions() : null,
    tryApi(() => smsApi.purchases.list({ search, providerId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const providerList = providers.ok ? providers.data : [];
  const filtered = Boolean(search || providerId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} purchase(s)` : "Purchases"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Invoice, reference, provider" filtered={filtered}>
            <FilterSelect
              name="provider"
              label="Provider"
              value={providerId ? String(providerId) : undefined}
              options={providerList.map((provider) => ({ value: String(provider.id), label: providerLabel(provider) }))}
              allLabel="All providers"
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
          icon={ShoppingCart}
          title={filtered ? "No purchases match these filters" : "No purchases yet"}
          description={filtered ? undefined : "Record the SMS you buy from a provider with Record purchase."}
        />
      ) : (
        <>
          <PurchasesTable
            rows={result.data.items}
            allShown={offset === 0 && result.data.items.length === result.data.totalCount}
            providers={providerList}
            currencies={currencies?.ok ? currencies.data : []}
            canManage={canManage}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, provider: providerId, from, to }}
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
