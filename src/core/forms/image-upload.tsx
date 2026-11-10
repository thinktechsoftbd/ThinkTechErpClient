"use client";

import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { IMAGE_ACCEPT, IMAGE_EXTENSIONS, MAX_UPLOAD_MB, type FileFolder, type StoredFile } from "@/core/files/constants";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/utils/cn";

/**
 * An image a record links to (a product's image_url, an organization's logo_url, a user's photoUrl): shows
 * the current one, uploads a new one to the API's file storage (button, or drop a file on the box) and
 * submits its url as `name` with the form. The file goes to `organizationId`'s folder, else the current
 * organization's. Remove only clears the link; the stored file stays.
 */
export function ImageUpload({
  name,
  folder,
  defaultValue,
  id,
  alt = "Image",
  organizationId,
}: {
  name: string;
  folder: FileFolder;
  defaultValue?: string | null;
  id?: string;
  alt?: string;
  organizationId?: number;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [broken, setBroken] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    if (!IMAGE_EXTENSIONS.includes(extension)) return setError("Choose a JPG, PNG, WEBP, GIF or AVIF image.");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setError(`The image is larger than ${MAX_UPLOAD_MB} MB.`);

    setError(undefined);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("folder", folder);
      body.set("file", file);
      if (organizationId) body.set("organizationId", String(organizationId));
      const response = await fetch("/api/files", { method: "POST", body });
      // An expired session is redirected to the sign-in page.
      if (response.redirected) return setError("Your session has expired. Sign in again to upload.");
      const data = (await response.json().catch(() => null)) as (Partial<StoredFile> & { error?: string }) | null;
      if (!response.ok || !data?.url) return setError(data?.error ?? `The upload failed (HTTP ${response.status}).`);
      setUrl(data.url);
      setBroken(false);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !uploading) void upload(file);
  }

  return (
    <div className="flex items-start gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        title="Drop an image here"
        className={cn(
          "relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gray-50 dark:bg-white/[0.03]",
          dragging ? "border-brand-500 ring-3 ring-brand-500/10" : "border-gray-200 dark:border-gray-800",
        )}
      >
        {url && !broken ? (
          // A file on the API (or another site): next/image would need each host configured.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt} className="size-full object-contain" onError={() => setBroken(true)} />
        ) : (
          <ImageIcon className="size-8 text-gray-300 dark:text-gray-600" aria-hidden />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
            <Loader2 className="size-6 animate-spin text-brand-500" aria-label="Uploading" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button id={id} variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <Upload className="size-4" aria-hidden />
            {uploading ? "Uploading…" : url ? "Change image" : "Upload image"}
          </Button>
          {url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUrl("");
                setError(undefined);
                setBroken(false);
              }}
              disabled={uploading}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="size-4" aria-hidden /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          JPG, PNG, WEBP, GIF or AVIF, up to {MAX_UPLOAD_MB} MB. You can also drop it on the box.
        </p>
        {url && broken && <p className="text-xs text-amber-600 dark:text-amber-400">The image at this address can&apos;t be shown.</p>}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
