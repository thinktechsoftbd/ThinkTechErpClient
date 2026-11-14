import "server-only";
import { ApiError } from "@/core/api/errors";
import type { ModuleDefinition } from "@/core/modules/types";
import { canAccessModule } from "./roles";
import { requireSession } from "./session";

/** Server Action guard: re-checks the session and the module's access before mutating. */
export async function requireModuleAccess(module: ModuleDefinition) {
  const session = await requireSession();
  if (!canAccessModule(session, module)) {
    throw new ApiError({ status: 403, message: `Your account cannot use the ${module.name} module.` });
  }
  return session;
}

/** Server Action guard for a permission code the API also enforces (e.g. "AREA.M"). */
export async function requirePermission(code: string) {
  const session = await requireSession();
  if (!session.permissions.includes(code)) {
    throw new ApiError({ status: 403, message: `Your account does not have the ${code} permission.` });
  }
  return session;
}
