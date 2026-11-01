import Link from "next/link";

const ENTRY_PATHS: Record<string, string> = {
  Invoice: "/sales/invoices",
  PaidOnInvoice: "/sales/invoices",
  Receipt: "/sales/receipts",
  Refund: "/sales/receipts",
  Return: "/sales/returns",
  ReturnRefund: "/sales/returns",
};

/** The page of the document behind a customer ledger entry, or null (e.g. the opening balance). */
export function ledgerEntryHref(entryType: string, documentId: number | null) {
  const base = ENTRY_PATHS[entryType];
  return base && documentId ? `${base}/${documentId}` : null;
}

/** A customer ledger entry's document number, linked to the invoice or receipt. */
export function LedgerEntryLink({
  entryType,
  documentId,
  documentNo,
}: {
  entryType: string;
  documentId: number | null;
  documentNo: string | null;
}) {
  if (!documentNo) return <span className="text-gray-400">—</span>;
  const href = ledgerEntryHref(entryType, documentId);
  return href ? (
    <Link href={href} className="font-medium whitespace-nowrap text-brand-500 hover:underline print:text-inherit print:no-underline">
      {documentNo}
    </Link>
  ) : (
    <span className="font-medium whitespace-nowrap">{documentNo}</span>
  );
}
