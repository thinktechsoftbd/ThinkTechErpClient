import Link from "next/link";
import { label } from "@/modules/inventory/types";

const DOCUMENT_PATHS: Record<string, string> = {
  PurchaseInvoice: "/purchase/invoices",
  GoodsReceipt: "/purchase/goods-receipts",
  PurchaseReturn: "/purchase/returns",
  StockAdjustment: "/inventory/adjustments",
  StockTransfer: "/inventory/transfers",
};

/** The page of the document behind a stock movement, or null for a type without one. */
export function documentHref(documentType: string | null | undefined, documentId: number | null | undefined) {
  const base = documentType ? DOCUMENT_PATHS[documentType] : undefined;
  return base && documentId ? `${base}/${documentId}` : null;
}

/** A document number linked to its page, with the document type under it. */
export function DocumentLink({
  documentType,
  documentId,
  documentNo,
  showType = true,
}: {
  documentType: string;
  documentId: number | null;
  documentNo: string | null;
  showType?: boolean;
}) {
  const href = documentHref(documentType, documentId);
  const text = documentNo || label(documentType);
  return (
    <>
      {href ? (
        <Link href={href} className="font-medium whitespace-nowrap text-brand-500 hover:underline print:text-inherit print:no-underline">
          {text}
        </Link>
      ) : (
        <span className="font-medium whitespace-nowrap">{text}</span>
      )}
      {showType && documentNo && <span className="block text-xs text-gray-500 dark:text-gray-400">{label(documentType)}</span>}
    </>
  );
}
