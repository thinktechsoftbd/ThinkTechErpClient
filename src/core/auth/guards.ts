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
