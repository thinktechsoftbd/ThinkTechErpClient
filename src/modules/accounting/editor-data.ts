import "server-only";
import type { ApiResult } from "@/core/api/client";
import { getLedgerHeads, getParties } from "./queries";
import type { LedgerHeadOption, PartyOption, Voucher } from "./types";
import type { VoucherEditorInitial } from "./components/voucher-editor";

export type VoucherEditorOptions = { heads: LedgerHeadOption[]; suppliers: PartyOption[]; customers: PartyOption[] };

/** The ledger heads, suppliers and customers the voucher and bill screens pick from. */
export async function loadVoucherEditorOptions(): Promise<ApiResult<VoucherEditorOptions>> {
  const [heads, suppliers, customers] = await Promise.all([getLedgerHeads(), getParties("Supplier"), getParties("Customer")]);
  if (!heads.ok) return heads;
  if (!suppliers.ok) return suppliers;
  if (!customers.ok) return customers;
  return { ok: true, data: { heads: heads.data, suppliers: suppliers.data, customers: customers.data } };
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
      partyId: String(line.supplierId ?? line.customerId ?? ""),
      debit: line.debitAmount ? String(line.debitAmount) : "",
      credit: line.creditAmount ? String(line.creditAmount) : "",
      narration: line.lineNarration ?? "",
    })),
  };
}
