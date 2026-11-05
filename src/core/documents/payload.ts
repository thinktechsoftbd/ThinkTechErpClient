import "server-only";

/**
 * Document editors submit their state as JSON in a hidden "payload" field, plus "intent"
 * ("save" keeps a draft, "post" posts it too). Returns null when the payload is missing or broken.
 */
export function readPayload<T>(formData: FormData): T | null {
  const raw = formData.get("payload");
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** "finalize" (invoices): post, then post the bill voucher; other documents treat it as "save". */
export function readIntent(formData: FormData): "save" | "post" | "finalize" {
  const intent = formData.get("intent");
  return intent === "post" || intent === "finalize" ? intent : "save";
}

/** A message passed to the next page in the query string (e.g. a post that failed after saving). */
export function withNotice(path: string, notice: string) {
  return `${path}${path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(notice.slice(0, 300))}`;
}
