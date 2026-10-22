import type { ReactNode } from "react";
import { requireSession } from "@/core/auth/session";
import { canManageSecurity } from "../access";

/** Renders its children only for users who may change security data (SECURITY.M). Use inside <Suspense>. */
export async function ManageOnly({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return canManageSecurity(session) ? children : null;
}
