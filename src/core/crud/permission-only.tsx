import type { ReactNode } from "react";
import { requireSession } from "@/core/auth/session";

/**
 * Renders its children only for users whose token holds the permission code (e.g. "SETTING.M"),
 * mirroring the API policy that guards the action. Reads the session: use inside <Suspense>.
 */
export async function PermissionOnly({ code, children }: { code: string; children: ReactNode }) {
  const session = await requireSession();
  return session.permissions.includes(code) ? children : null;
}
