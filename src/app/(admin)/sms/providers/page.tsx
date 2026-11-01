import type { Metadata } from "next";
import { RadioTower } from "lucide-react";
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
import { firstParam } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageSms } from "@/modules/sms/access";
import { saveProviderAction } from "@/modules/sms/actions/providers";
import { smsApi } from "@/modules/sms/api";
import { ProviderFields } from "@/modules/sms/components/providers/provider-fields";
import { ProvidersTable } from "@/modules/sms/components/providers/providers-table";
import { SMS_MANAGE_PERMISSION } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS Providers" };

const basePath = "/sms/providers";
type Props = PageProps<"/sms/providers">;

export default function SmsProvidersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Providers"
        description="The SMS gateways you buy SMS from, their API access, and how many SMS each has left to allocate."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Providers" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SMS_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New provider"
                title="New provider"
                action={saveProviderAction.bind(null, null)}
                submitLabel="Create"
              >
                <ProviderFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <ProviderList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ProviderList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);

  const [session, result] = await Promise.all([requireSession(), tryApi(() => smsApi.providers.list({ isActive }))]);
  const filtered = Boolean(search) || isActive !== undefined;
  // The API returns every provider at once; the search narrows them here.
  const needle = search?.toLowerCase();
  const rows = result.ok
    ? result.data.filter((row) => !needle || row.name.toLowerCase().includes(needle) || row.code.toLowerCase().includes(needle))
    : [];

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(rows.length)} provider(s)` : "Providers"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Name or code" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={RadioTower}
          title={filtered ? "No providers match these filters" : "No providers yet"}
          description={filtered ? undefined : "Add the SMS gateways you buy SMS from with New provider."}
        />
      ) : (
        <ProvidersTable rows={rows} canManage={canManageSms(session)} />
      )}
    </>
  );
}
