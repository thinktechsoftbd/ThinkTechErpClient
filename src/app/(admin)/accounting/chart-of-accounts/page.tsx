import type { Metadata } from "next";
import { ListTree } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManageAccounting } from "@/modules/accounting/access";
import { importStandardChartAction } from "@/modules/accounting/actions/chart";
import { accountingApi } from "@/modules/accounting/api";
import { ChartOfAccountsTree } from "@/modules/accounting/components/chart-tree";

export const metadata: Metadata = { title: "Chart of Accounts" };

export default function ChartOfAccountsPage() {
  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        description="Parent Class → Account Class → Main Class → Map Class → Sub Class. Sub classes are the ledger heads vouchers post to."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting", href: "/accounting" }, { label: "Chart of Accounts" }]}
      />
      <Card>
        <Suspense fallback={<TableSkeleton rows={10} columns={4} />}>
          <Chart />
        </Suspense>
      </Card>
    </>
  );
}

async function Chart() {
  const [session, result] = await Promise.all([requireSession(), tryApi(() => accountingApi.chart.list())]);
  if (!result.ok) return <ApiErrorState error={result.error} />;
  const canManage = canManageAccounting(session);

  return (
    <ChartOfAccountsTree
      // Remounted once the chart is first filled, so its top levels open.
      key={result.data.length === 0 ? "empty" : "chart"}
      accounts={result.data}
      canManage={canManage}
      empty={
        <EmptyState
          icon={ListTree}
          title="No chart of accounts yet"
          description={
            canManage
              ? "Start from the standard chart for a trading business (cash, bank, receivables, payables, sales, purchases, expenses, ...) and adjust it, or add your own parent classes."
              : "An accountant with the manage permission sets up the chart of accounts."
          }
          action={
            canManage && (
              <DocumentActionButton
                action={importStandardChartAction}
                variant="primary"
                confirmMessage="Add the standard chart of accounts? You can rename, move, clear or delete its accounts afterwards."
              >
                Load the standard chart
              </DocumentActionButton>
            )
          }
        />
      }
    />
  );
}
