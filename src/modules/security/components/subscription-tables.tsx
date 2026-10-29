import Link from "next/link";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/core/utils/format";
import {
  deleteSubscriptionAction,
  deleteSubscriptionModuleAction,
  saveSubscriptionAction,
  saveSubscriptionModuleAction,
} from "../actions";
import type { Subscription, SubscriptionModule, SubscriptionStatus } from "../types";
import { SubscriptionFields, type PickerOption } from "./subscription-fields";
import { SubscriptionModuleFields } from "./subscription-module-fields";

const muted = "text-gray-500 dark:text-gray-400";

export function SubscriptionModulesTable({ rows, canManage }: { rows: SubscriptionModule[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Module</TH>
          <TH className="text-right">Subscriptions</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <p className="font-medium text-gray-800 dark:text-white/90">{row.moduleName}</p>
              {row.remarks && (
                <p className={`max-w-md truncate text-xs ${muted}`} title={row.remarks}>
                  {row.remarks}
                </p>
              )}
            </TD>
            <TD className="text-right">
              <Link
                href={`/security/subscriptions?module=${row.id}`}
                className="font-medium text-brand-500 hover:underline"
                title={`Show subscriptions to ${row.moduleName}`}
              >
                {formatNumber(row.subscriptionCount)}
              </Link>
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
                    title="Edit subscription module"
                    action={saveSubscriptionModuleAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <SubscriptionModuleFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteSubscriptionModuleAction.bind(null, row.id)}
                    itemLabel={`module "${row.moduleName}"`}
                    message={
                      row.subscriptionCount > 0
                        ? `${formatNumber(row.subscriptionCount)} subscription(s) use it, so the API will refuse. Deactivate it instead.`
                        : undefined
                    }
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

const statusTones: Record<SubscriptionStatus, "success" | "warning" | "gray" | "error"> = {
  Active: "success",
  Pending: "warning",
  Expired: "gray",
  Cancelled: "error",
};

export function SubscriptionsTable({
  rows,
  canManage,
  organizations,
  modules,
  currencies,
}: {
  rows: Subscription[];
  canManage: boolean;
  /** Options for the edit modal. */
  organizations: PickerOption[];
  modules: PickerOption[];
  currencies: PickerOption[];
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Organization</TH>
          <TH>Module</TH>
          <TH>Type</TH>
          <TH>Billing</TH>
          <TH>Period</TH>
          <TH className="text-right">Total</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className="font-medium text-gray-800 dark:text-white/90">{row.organizationName}</TD>
            <TD>{row.moduleName}</TD>
            <TD>
              <Badge tone={row.subscriptionType === "Premium" ? "brand" : "gray"}>{row.subscriptionType}</Badge>
            </TD>
            <TD className="whitespace-nowrap">
              {row.billingPeriodCount} × {row.billingPeriodType}
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>
              {formatDate(row.startDate)} – {formatDate(row.endDate)}
            </TD>
            <TD className="text-right whitespace-nowrap">
              <span className="font-medium">{formatMoney(row.totalAmount, row.currencyName)}</span>
              {(row.discountAmount > 0 || row.vatAmount > 0) && (
                <p className={`text-xs ${muted}`}>
                  {row.discountAmount > 0 && `−${formatNumber(row.discountAmount)} discount`}
                  {row.discountAmount > 0 && row.vatAmount > 0 && " · "}
                  {row.vatAmount > 0 && `+${formatNumber(row.vatAmount)} VAT`}
                </p>
              )}
            </TD>
            <TD>
              <Badge tone={statusTones[row.status] ?? "gray"}>{row.status}</Badge>
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit subscription"
                    description={`${row.organizationName} · ${row.moduleName}`}
                    action={saveSubscriptionAction.bind(null, row.id)}
                    submitLabel="Save changes"
                    size="lg"
                  >
                    <SubscriptionFields value={row} organizations={organizations} modules={modules} currencies={currencies} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteSubscriptionAction.bind(null, row.id)}
                    itemLabel={`the ${row.moduleName} subscription of ${row.organizationName}`}
                    message="Consider setting its status to Cancelled instead, to keep its history."
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
