import type { Metadata } from "next";
import { Building2, MessageSquarePlus, RadioTower, ShoppingCart } from "lucide-react";
import { Suspense } from "react";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, StatGridSkeleton, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatNumber } from "@/core/utils/format";
import { LowestBalancesTable, ProviderStockTable } from "@/modules/sms/components/overview-tables";
import { SmsStatCards } from "@/modules/sms/components/sms-stat-cards";
import { getSmsOverview } from "@/modules/sms/queries";
import { SMS_MANAGE_PERMISSION } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS" };

export default function SmsOverviewPage() {
  return (
    <>
      <PageHeader
        title="SMS"
        description="SMS bought from providers, allocated to organizations, and what the organizations used and have left."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SMS_MANAGE_PERMISSION}>
              <LinkButton href="/sms/purchases?new=1" variant="outline">
                <ShoppingCart className="size-4" aria-hidden /> Record purchase
              </LinkButton>
              <LinkButton href="/sms/allocations?new=1">
                <MessageSquarePlus className="size-4" aria-hidden /> Allocate
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <StatGridSkeleton count={6} />
            <Card>
              <TableSkeleton rows={3} columns={6} />
            </Card>
          </div>
        }
      >
        <OverviewContent />
      </Suspense>
    </>
  );
}

async function OverviewContent() {
  const result = await getSmsOverview();
  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  const overview = result.data;

  return (
    <div className="space-y-6">
      <SmsStatCards
        overview={overview}
        show={["purchased", "allocated", "unallocated", "used", "organizationAvailable", "spend"]}
      />

      <Card>
        <CardHeader
          title="Providers"
          description={`${formatNumber(overview.activeProviderCount)} of ${formatNumber(overview.providerCount)} active`}
          actions={
            <LinkButton href="/sms/providers" variant="outline" size="sm">
              Manage providers
            </LinkButton>
          }
        />
        {overview.providers.length === 0 ? (
          <EmptyState icon={RadioTower} title="No providers yet" description="Add the SMS gateways you buy SMS from in Providers." />
        ) : (
          <ProviderStockTable providers={overview.providers} />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Lowest balances"
          description="Organizations with the fewest SMS left."
          actions={
            <LinkButton href="/sms/organizations" variant="outline" size="sm">
              All organizations
            </LinkButton>
          }
        />
        {overview.lowestBalances.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organization has SMS yet"
            description="Allocate SMS to an organization to follow its balance here."
          />
        ) : (
          <LowestBalancesTable rows={overview.lowestBalances} />
        )}
      </Card>
    </div>
  );
}
