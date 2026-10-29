import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { canManageSecurity } from "@/modules/security/access";
import { saveSubscriptionAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { SubscriptionFields } from "@/modules/security/components/subscription-fields";
import { SubscriptionsTable } from "@/modules/security/components/subscription-tables";
import { getCurrencyOptions, getOrganizationOptions, getSubscriptionModuleOptions } from "@/modules/security/queries";
import {
  SECURITY_MANAGE_PERMISSION,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_TYPES,
  type SubscriptionStatus,
  type SubscriptionType,
} from "@/modules/security/types";

export const metadata: Metadata = { title: "Subscriptions" };

const basePath = "/security/subscriptions";
type Props = PageProps<"/security/subscriptions">;

function idFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

function oneOf<T extends string>(value: string | string[] | undefined, allowed: readonly T[]) {
  const raw = firstParam(value);
  return (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : undefined;
}

/** Organizations, modules and currencies for the filters and the add/edit modal. */
async function loadOptions() {
  const [organizations, modules, currencies] = await Promise.all([
    getOrganizationOptions(),
    getSubscriptionModuleOptions(),
    getCurrencyOptions(),
  ]);
  return { organizations, modules, currencies };
}

export default function SubscriptionsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Which organization subscribes to which module, for what period and amount."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Subscriptions" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SECURITY_MANAGE_PERMISSION}>
              <NewSubscriptionButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <SubscriptionsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewSubscriptionButton() {
  const { organizations, modules, currencies } = await loadOptions();
  if (!organizations.ok || !modules.ok || !currencies.ok) return null;
  return (
    <FormModalButton
      mode="create"
      label="New subscription"
      title="New subscription"
      action={saveSubscriptionAction.bind(null, null)}
      submitLabel="Create"
      size="lg"
    >
      <SubscriptionFields
        organizations={organizations.data.filter((option) => option.isActive !== false)}
        modules={modules.data.filter((option) => option.isActive !== false)}
        currencies={currencies.data}
      />
    </FormModalButton>
  );
}

async function SubscriptionsList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const organizationId = idFilter(query.org);
  const subscriptionModuleId = idFilter(query.module);
  const status = oneOf<SubscriptionStatus>(query.status, SUBSCRIPTION_STATUSES);
  const subscriptionType = oneOf<SubscriptionType>(query.type, SUBSCRIPTION_TYPES);
  const offset = parseOffset(query.offset);

  const [session, options, result] = await Promise.all([
    requireSession(),
    loadOptions(),
    tryApi(() =>
      securityApi.getSubscriptions({
        search,
        organizationId,
        subscriptionModuleId,
        status,
        subscriptionType,
        limit: CRUD_PAGE_SIZE,
        offset,
      }),
    ),
  ]);
  const organizations = options.organizations.ok ? options.organizations.data : [];
  const modules = options.modules.ok ? options.modules.data : [];
  const currencies = options.currencies.ok ? options.currencies.data : [];
  const optionError = [options.organizations, options.modules, options.currencies].find((item) => !item.ok);
  const filtered = Boolean(search) || [organizationId, subscriptionModuleId, status, subscriptionType].some((value) => value !== undefined);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} subscription(s)` : "Subscriptions"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Organization or module" filtered={filtered}>
            <FilterSelect
              name="org"
              label="Organization"
              value={organizationId ? String(organizationId) : undefined}
              options={organizations.map((option) => ({ value: String(option.id), label: option.name }))}
              allLabel="All organizations"
              className="w-44"
            />
            <FilterSelect
              name="module"
              label="Module"
              value={subscriptionModuleId ? String(subscriptionModuleId) : undefined}
              options={modules.map((option) => ({ value: String(option.id), label: option.name }))}
              allLabel="All modules"
              className="w-40"
            />
            <FilterSelect
              name="status"
              label="Status"
              value={status}
              options={SUBSCRIPTION_STATUSES.map((value) => ({ value, label: value }))}
              allLabel="All statuses"
              className="w-36"
            />
            <FilterSelect
              name="type"
              label="Type"
              value={subscriptionType}
              options={SUBSCRIPTION_TYPES.map((value) => ({ value, label: value }))}
              allLabel="All types"
              className="w-36"
            />
          </ListToolbar>
        }
      />
      {optionError && !optionError.ok && (
        <Alert tone="warning" className="mx-5 mt-4">
          Some drop-down values couldn&apos;t be loaded, so editing is limited: {optionError.error.message}
        </Alert>
      )}
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={filtered ? "No subscriptions match these filters" : "No subscriptions yet"}
          description={filtered ? undefined : "Create one with New subscription."}
        />
      ) : (
        <>
          <SubscriptionsTable
            rows={result.data.items}
            canManage={canManageSecurity(session) && !optionError}
            organizations={organizations}
            modules={modules}
            currencies={currencies}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, org: organizationId, module: subscriptionModuleId, status, type: subscriptionType }}
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
