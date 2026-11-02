import "server-only";
import { tryApi, type ApiResult } from "@/core/api/client";
import { getCurrentOrganization, getMyOrganizations } from "@/core/org/organization";
import { getCurrencyOptions } from "@/modules/inventory/queries";
import type { LookupOption } from "@/modules/settings/types";
import { accountingApi } from "./api";
import { getLedgerHeadCount, getParties, getPaymentMethods, getVoucherTypes } from "./queries";
import type { LookupValueOption, PartyOption, Voucher } from "./types";
import type { VoucherEditorInitial, VoucherOrganization } from "./components/voucher-editor";

export type VoucherEditorOptions = {
  /** How many ledger heads the chart has; the pickers search them on the server. */
  headCount: number;
  /** The suppliers and customers of the organization chosen in the header. */
  parties: PartyOption[];
  currencies: LookupOption[];
  voucherTypes: LookupValueOption[];
  paymentMethods: LookupValueOption[];
};

/** The parties, currencies, voucher types and payment methods the voucher and bill screens pick from. */
export async function loadVoucherEditorOptions(): Promise<ApiResult<VoucherEditorOptions>> {
  const [headCount, parties, currencies, voucherTypes, paymentMethods] = await Promise.all([
    getLedgerHeadCount(),
    getParties(),
    getCurrencyOptions(),
    getVoucherTypes(),
    getPaymentMethods(),
  ]);
  if (!headCount.ok) return headCount;
  if (!parties.ok) return parties;
  if (!currencies.ok) return currencies;
  if (!voucherTypes.ok) return voucherTypes;
  if (!paymentMethods.ok) return paymentMethods;
  return {
    ok: true,
    data: {
      headCount: headCount.data,
      parties: parties.data,
      currencies: currencies.data,
      voucherTypes: voucherTypes.data,
      paymentMethods: paymentMethods.data,
    },
  };
}

/**
 * The user's organizations for the voucher's Organization picker, each with its own parties, and the one
 * chosen in the header. Empty when there is nothing to choose from (dev sign-in): the voucher then goes
 * to the header's organization.
 */
export async function loadVoucherOrganizations(
  headerParties: PartyOption[],
): Promise<{ organizations: VoucherOrganization[]; currentId: number | null }> {
  const [mine, current] = await Promise.all([getMyOrganizations(), getCurrentOrganization()]);
  if (!mine.ok || !current) return { organizations: [], currentId: null };

  const organizations = await Promise.all(
    mine.data.map(async (organization): Promise<VoucherOrganization> => {
      if (organization.organizationId === current.organizationId)
        return { id: organization.organizationId, name: organization.name, parties: headerParties };
      const parties = await tryApi(() => accountingApi.parties(undefined, { limit: 500 }, organization.organizationId));
      return { id: organization.organizationId, name: organization.name, parties: parties.ok ? parties.data : [] };
    }),
  );
  return { organizations, currentId: current.organizationId };
}

/** A saved draft as the editor's starting state. */
export function editorInitialFrom(voucher: Voucher): VoucherEditorInitial {
  return {
    organizationId: voucher.organizationId,
    voucherRefNo: voucher.voucherRefNo,
    voucherTypeId: String(voucher.voucherTypeId),
    voucherDate: voucher.voucherDate,
    paymentMethodId: voucher.paymentMethodId ? String(voucher.paymentMethodId) : "",
    chequeNo: voucher.chequeNo ?? "",
    chequeDate: voucher.chequeDate ?? "",
    payType: voucher.payType ?? "",
    narration: voucher.narration ?? "",
    lines: voucher.lines.map((line) => ({
      id: line.id,
      account: { id: line.accountId, code: line.accountCode, name: line.accountName, nature: "", path: null },
      partyId: line.partyId ? String(line.partyId) : "",
      debit: line.debitAmount ? String(line.debitAmount) : "",
      credit: line.creditAmount ? String(line.creditAmount) : "",
      currencyId: String(line.currencyLookupDataId),
      rate: String(line.localExchangeRate),
      narration: line.lineNarration ?? "",
    })),
  };
}
