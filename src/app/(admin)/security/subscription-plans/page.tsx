import type { Metadata } from "next";
import { BadgeDollarSign } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, FilterSelect, ListToolbar, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageSecurity } from "@/modules/security/access";
import { saveSubscriptionPlanAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { SubscriptionPlanFields } from "@/modules/security/components/subscription-plan-fields";
import { SubscriptionPlansTable } from "@/modules/security/components/subscription-plans-table";
import { getCurrencyOptions } from "@/modules/security/queries";
import { SECURITY_MANAGE_PERMISSION } from "@/modules/security/types";

export const metadata: Metadata = { title: "Subscription Plans" };

const basePath = "/security/subscription-plans";
/** Plans per page (the API's default page). */
const PAGE_SIZE = 50;
type Props = PageProps<"/security/subscription-plans">;

export default function SubscriptionPlansPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Subscription Plans"
        description="The plans offered to organizations: price, discount, billing period, and the features each includes."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Subscription Plans" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SECURITY_MANAGE_PERMISSION}>
              <NewPlanButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <PlansList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewPlanButton() {
  const currencies = await getCurrencyOptions();
  if (!currencies.ok) return null;
  return (
    <FormModalButton
      mode="create"
      label="New plan"
      title="New subscription plan"
      description="The plan, its price, and the features it includes."
      action={saveSubscriptionPlanAction.bind(null, null)}
      submitLabel="Create plan"
      size="lg"
    >
      <SubscriptionPlanFields currencies={currencies.data} />
    </FormModalButton>
  );
}

async function PlansList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, currencies, result] = await Promise.all([
    requireSession(),
    getCurrencyOptions(),
    tryApi(() => securityApi.getSubscriptionPlans({ search, isActive, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} plan(s)` : "Plans"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search plans" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={BadgeDollarSign}
          title={filtered ? "No plans match these filters" : "No subscription plans yet"}
          description={filtered ? undefined : "Create one with New plan."}
        />
      ) : (
        <>
          <SubscriptionPlansTable
            rows={result.data.items}
            currencies={currencies.ok ? currencies.data : []}
            canManage={canManageSecurity(session)}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, active: isActive === undefined ? undefined : String(isActive) }}
            offset={offset}
            limit={PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
