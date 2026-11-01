import "server-only";
import type { ApiResult } from "@/core/api/client";
import { getCurrencyOptions } from "@/modules/inventory/queries";
import type { LookupOption } from "@/modules/settings/types";
import { getLedgerHeads, getParties } from "./queries";
import type { LedgerHeadOption, PartyOption, Voucher } from "./types";
import type { VoucherEditorInitial } from "./components/voucher-editor";

export type VoucherEditorOptions = { heads: LedgerHeadOption[]; parties: PartyOption[]; currencies: LookupOption[] };

/** The ledger heads, parties (suppliers and customers) and currencies the voucher and bill screens pick from. */
export async function loadVoucherEditorOptions(): Promise<ApiResult<VoucherEditorOptions>> {
  const [heads, parties, currencies] = await Promise.all([getLedgerHeads(), getParties(), getCurrencyOptions()]);
  if (!heads.ok) return heads;
  if (!parties.ok) return parties;
  if (!currencies.ok) return currencies;
  return { ok: true, data: { heads: heads.data, parties: parties.data, currencies: currencies.data } };
}

/** A saved draft as the editor's starting state. */
export function editorInitialFrom(voucher: Voucher): VoucherEditorInitial {
  return {
    voucherType: voucher.voucherType as VoucherEditorInitial["voucherType"],
    voucherDate: voucher.voucherDate,
    referenceNo: voucher.referenceNo ?? "",
    narration: voucher.narration ?? "",
    lines: voucher.lines.map((line) => ({
      accountId: String(line.accountId),
      partyId: line.partyId ? String(line.partyId) : "",
      debit: line.debitAmount ? String(line.debitAmount) : "",
      credit: line.creditAmount ? String(line.creditAmount) : "",
      currencyId: String(line.currencyLookupDataId),
      rate: String(line.localExchangeRate),
      narration: line.lineNarration ?? "",
    })),
  };
}
