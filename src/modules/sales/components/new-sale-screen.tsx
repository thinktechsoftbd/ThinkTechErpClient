import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { canManageSales } from "../access";
import { saveSaleAction } from "../actions/invoices";
import { loadSalesEditorOptions } from "../editor-data";
import { SalesEditor } from "./sales-editor";

/** A new sale, on its page or (with `returnTo`, the list) in the popup over the sales list. */
export async function NewSaleScreen({ returnTo }: { returnTo?: string }) {
  const [session, options] = await Promise.all([requireSession(), loadSalesEditorOptions()]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  const canManage = canManageSales(session);
  return (
    <SalesEditor
      action={saveSaleAction.bind(null, null)}
      options={options.data}
      canPost={canManage}
      canAddCustomer={canManage}
      cancelHref="/sales/invoices"
      returnTo={returnTo}
    />
  );
}
