import "server-only";
import { apiFetch } from "@/core/api/client";
import type { FileFolder, StoredFile } from "./constants";

/**
 * Uploads a file to an organization's folder: `organizationId` (the API checks the user may work in it, which
 * ORGANIZATION.M allows for any) or else the current one. It gets a new random name and keeps its extension.
 */
export function uploadFile(folder: FileFolder, file: File, organizationId?: number) {
  const body = new FormData();
  body.set("file", file, file.name);
  return apiFetch<StoredFile>(`/api/files/${folder}`, { method: "POST", body, organizationId });
}
