import "server-only";
import { requireSession } from "@/core/auth/session";
import { ApiError } from "./errors";

/**
 * Runs an API call for a Route Handler that browser components fetch (e.g. product search while
 * typing): the session's token stays on the server. API errors come back as { error } with their status.
 */
export async function routeJson<T>(call: () => Promise<T>) {
  await requireSession();
  try {
    return Response.json(await call());
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status || 502 });
    throw error;
  }
}

/** A positive whole number from the query string, or undefined. */
export function queryId(params: URLSearchParams, name: string) {
  const value = Number(params.get(name));
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
