import { routeJson } from "@/core/api/route-json";
import { requireSession } from "@/core/auth/session";
import { uploadFile } from "@/core/files/api";
import { FILE_FOLDERS, type FileFolder, type StoredFile } from "@/core/files/constants";

/**
 * Uploads a file for a record (multipart: "folder" = product, organization or user, "file", and optionally
 * "organizationId", e.g. the organization whose logo it is; else the current organization) and answers the
 * API's StoredFile; save its url in the record's column. The session's token stays on the server.
 */
export async function POST(request: Request) {
  await requireSession();
  const form = await request.formData().catch(() => null);
  const folder = form?.get("folder");
  const file = form?.get("file");
  const organizationId = Number(form?.get("organizationId") ?? "");
  if (typeof folder !== "string" || !FILE_FOLDERS.includes(folder as FileFolder))
    return Response.json({ error: "Unknown upload folder." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a file to upload." }, { status: 400 });
  return routeJson(
    (): Promise<StoredFile> =>
      uploadFile(folder as FileFolder, file, Number.isSafeInteger(organizationId) && organizationId > 0 ? organizationId : undefined),
  );
}
