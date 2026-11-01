import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/core/auth/session";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { Skeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDateTime } from "@/core/utils/format";
import { canManageInventory } from "@/modules/inventory/access";
import { saveInventorySettingsAction } from "@/modules/inventory/actions/setup";
import { InventorySettingsFields } from "@/modules/inventory/components/setup/settings-fields";
import { getCurrencyOptions, getInventoryOptions, getInventorySettings } from "@/modules/inventory/queries";

export const metadata: Metadata = { title: "Inventory Settings" };

export default function InventorySettingsPage() {
  return (
    <>
      <PageHeader
        title="Inventory Settings"
        description="Currency, fiscal year and stock rules of the organization chosen in the header."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Inventory Settings" }]}
      />
      <Suspense fallback={<Skeleton className="h-[28rem] rounded-2xl" />}>
        <SettingsForm />
      </Suspense>
    </>
  );
}

async function SettingsForm() {
  const [session, settings, currencies, options] = await Promise.all([
    requireSession(),
    getInventorySettings(),
    getCurrencyOptions(),
    getInventoryOptions(),
  ]);
  if (!settings.ok) {
    return (
      <Card>
        <ApiErrorState error={settings.error} />
      </Card>
    );
  }

  const canManage = canManageInventory(session);
  const currencyList = currencies.ok ? currencies.data : [];
  const warehouses = options.ok ? options.data.warehouses.map(({ id, name, isActive }) => ({ id, name, isActive })) : [];
  const { data } = settings;

  return (
    <Card className="max-w-4xl">
      <CardHeader
        title="Settings"
        description={data.isConfigured && data.updatedAt ? `Last saved ${formatDateTime(data.updatedAt)}` : undefined}
        actions={data.isConfigured ? <Badge tone="success">Saved</Badge> : <Badge tone="warning">Not saved yet</Badge>}
      />
      <CardBody>
        <ActionForm action={saveInventorySettingsAction} className="space-y-6">
          {!data.isConfigured && (
            <Alert tone="warning" title="Save these settings first">
              The values below are only suggestions. Check them and save before entering purchases or stock.
            </Alert>
          )}
          {!currencies.ok ? (
            <Alert tone="error" title="Currencies couldn't be loaded">
              {currencies.error.message}
            </Alert>
          ) : (
            currencyList.length === 0 && (
              <Alert tone="warning" title="No currencies">
                Add BDT to the Currency list in{" "}
                <Link href="/settings/lookup-data" className="font-medium underline">
                  Settings › Lookup Data
                </Link>{" "}
                first.
              </Alert>
            )
          )}
          <FormMessage />
          <fieldset disabled={!canManage} className="min-w-0 space-y-6">
            <InventorySettingsFields settings={data} currencies={currencyList} warehouses={warehouses} />
          </fieldset>
          {canManage ? (
            <div className="flex justify-end border-t border-gray-100 pt-5 dark:border-gray-800">
              <SubmitButton className="min-w-36">Save settings</SubmitButton>
            </div>
          ) : (
            <p className="border-t border-gray-100 pt-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              You can view these settings. Changing them needs the inventory manage permission.
            </p>
          )}
        </ActionForm>
      </CardBody>
    </Card>
  );
}
