import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatMoney, formatNumber } from "@/core/utils/format";
import { deleteSubscriptionPlanAction, saveSubscriptionPlanAction } from "../actions";
import type { SubscriptionPlan } from "../types";
import type { PickerOption } from "./subscription-fields";
import { SubscriptionPlanFields } from "./subscription-plan-fields";

const muted = "text-gray-500 dark:text-gray-400";

/** The first few feature titles, for the list; the popup shows them all with their details. */
function FeatureSummary({ plan }: { plan: SubscriptionPlan }) {
  if (plan.features.length === 0) return <span className={muted}>—</span>;
  const shown = plan.features.slice(0, 3);
  return (
    <span className="block max-w-64">
      <span className="font-medium text-gray-800 dark:text-white/90">{formatNumber(plan.featureCount)}</span>
      <span className={`block truncate text-xs ${muted}`} title={plan.features.map((feature) => feature.title).join(", ")}>
        {shown.map((feature) => feature.title).join(", ")}
        {plan.features.length > shown.length ? ", …" : ""}
      </span>
    </span>
  );
}

export function SubscriptionPlansTable({
  rows,
  currencies,
  canManage,
}: {
  rows: SubscriptionPlan[];
  /** For the edit modal's currency picker. */
  currencies: PickerOption[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Plan</TH>
          <TH>Billing</TH>
          <TH className="text-right">Regular price</TH>
          <TH className="text-right">Discount</TH>
          <TH className="text-right">Discount price</TH>
          <TH>Features</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <p className="font-medium text-gray-800 dark:text-white/90">{row.nameEn}</p>
              {row.nameLocal && (
                <p lang="bn" className={`text-xs ${muted}`}>
                  {row.nameLocal}
                </p>
              )}
              {row.shortNote && (
                <p className={`max-w-xs truncate text-xs ${muted}`} title={row.shortNote}>
                  {row.shortNote}
                </p>
              )}
            </TD>
            <TD>
              <Badge tone={row.billingPeriodType === "Yearly" ? "brand" : "gray"}>{row.billingPeriodType}</Badge>
            </TD>
            <TD className="text-right whitespace-nowrap tabular-nums">{formatMoney(row.regularPrice, row.currencyName)}</TD>
            <TD className={`text-right whitespace-nowrap tabular-nums ${row.discountPercentage > 0 ? "" : muted}`}>
              {row.discountPercentage > 0 ? `${formatNumber(row.discountPercentage)}%` : "—"}
            </TD>
            <TD className="text-right whitespace-nowrap tabular-nums">
              <span className="font-medium text-gray-800 dark:text-white/90">{formatMoney(row.discountPrice, row.currencyName)}</span>
              {row.localExchangeRate !== 1 && (
                <span className={`block text-xs ${muted}`}>rate {formatNumber(row.localExchangeRate)}</span>
              )}
            </TD>
            <TD>
              <FeatureSummary plan={row} />
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(row.updatedAt ?? row.createdAt)}</TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit subscription plan"
                    description={row.nameEn}
                    action={saveSubscriptionPlanAction.bind(null, row.id)}
                    submitLabel="Save plan"
                    size="lg"
                  >
                    <SubscriptionPlanFields value={row} currencies={currencies} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteSubscriptionPlanAction.bind(null, row.id)}
                    itemLabel={`subscription plan "${row.nameEn}"`}
                    message="Its features and their details are deleted too. This cannot be undone."
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
