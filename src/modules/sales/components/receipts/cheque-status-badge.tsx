import { Badge } from "@/core/ui/badge";
import type { CustomerReceipt } from "../../types";

const tones = { Pending: "warning", Cleared: "success", Bounced: "error" } as const;

/** "Cheque pending / cleared / bounced", so it doesn't read as the receipt's own status. */
export function ChequeStatusBadge({ status }: { status: CustomerReceipt["chequeStatus"] }) {
  if (!status) return null;
  return <Badge tone={tones[status]}>Cheque {status.toLowerCase()}</Badge>;
}
