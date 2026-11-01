import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManageAccounting } from "@/modules/accounting/access";
import { accountingApi } from "@/modules/accounting/api";
import { AccountClassTree } from "@/modules/accounting/components/account-class-tree";

export const metadata: Metadata = { title: "Chart of Accounts" };

export default function ChartOfAccountsPage() {
  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        description="Account class hierarchy in tree view: Parent Class → Account Class → Main Class → Map Class → Sub Class."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting", href: "/accounting" }, { label: "Chart of Accounts" }]}
      />
      <Suspense
        fallback={
          <Card>
            <TableSkeleton rows={10} columns={2} />
          </Card>
        }
      >
        <Chart />
      </Suspense>
    </>
  );
}

async function Chart() {
  const [session, result] = await Promise.all([requireSession(), tryApi(() => accountingApi.accountClasses.tree())]);
  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  return <AccountClassTree tree={result.data} canManage={canManageAccounting(session)} />;
}
