import "server-only";
import { ApiError } from "@/core/api/errors";
import type { ModuleDefinition } from "@/core/modules/types";
import { hasAnyRole } from "./roles";
import { requireSession } from "./session";

/** Server Action guard: re-checks the session and the module's roles before mutating. */
export async function requireModuleAccess(module: ModuleDefinition) {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, module.roles)) {
    throw new ApiError({ status: 403, message: `Your account cannot use the ${module.name} module.` });
  }
  return session;
}
