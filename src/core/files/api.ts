import "server-only";
import { apiFetch } from "@/core/api/client";
import type { FileFolder, StoredFile } from "./constants";

/** Uploads a file for a record; the storage API gives it a new random name and it keeps its extension. */
export function uploadFile(folder: FileFolder, file: File) {
  const body = new FormData();
  body.set("file", file, file.name);
  return apiFetch<StoredFile>(`/api/files/${folder}`, { method: "POST", body });
}
