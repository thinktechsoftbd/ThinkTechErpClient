import { Badge } from "@/core/ui/badge";

type Tone = "gray" | "brand" | "success" | "warning" | "error";

const tones: Record<string, Tone> = {
  Draft: "gray",
  Posted: "success",
  Approved: "brand",
  PartiallyReceived: "warning",
  Received: "success",
  InTransit: "warning",
  InProgress: "warning",
  Closed: "gray",
  Cancelled: "error",
  Unpaid: "error",
  PartiallyPaid: "warning",
  Paid: "success",
  Pending: "warning",
  Cleared: "success",
  Bounced: "error",
  Cash: "brand",
  Credit: "warning",
};

const labels: Record<string, string> = {
  PartiallyReceived: "Partially received",
  PartiallyPaid: "Partially paid",
  InTransit: "In transit",
  InProgress: "In progress",
};

/** Status of a stock or purchase document (Draft, Posted, Paid, In transit, ...). */
export function DocumentStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return <Badge tone={tones[status] ?? "gray"}>{labels[status] ?? status}</Badge>;
}
