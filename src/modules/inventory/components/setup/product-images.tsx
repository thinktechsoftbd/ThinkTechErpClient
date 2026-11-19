"use client";

import { ImageIcon, ImagePlus, Loader2, Star, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { FieldError } from "@/core/forms/action-form";
import { uploadImage } from "@/core/forms/image-upload";
import { IMAGE_ACCEPT, MAX_UPLOAD_MB } from "@/core/files/constants";
import { cn } from "@/core/utils/cn";
import { MAX_RELATED_IMAGES } from "../../types";

type DropTarget = "main" | "related";

const iconButton =
  "rounded-md bg-white/90 p-1 text-gray-600 shadow-theme-xs transition hover:bg-white dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900";

function droppedFiles(event: DragEvent) {
  event.preventDefault();
  return Array.from(event.dataTransfer.files);
}

/**
 * The product's pictures: one main image (product.image_url, and the primary product_image row) and up to
 * MAX_RELATED_IMAGES related ones (the other product_image rows, in order). Files go to the API's file
 * storage as soon as they are chosen or dropped; the form submits their urls as `imageUrl` and
 * `relatedImages` (JSON). Removing a picture only unlinks it; the stored file stays.
 */
export function ProductImages({
  defaultMain,
  defaultRelated,
  alt,
  className,
}: {
  defaultMain: string | null;
  defaultRelated: string[];
  /** Alt text for the previews, e.g. the product name. */
  alt: string;
  className?: string;
}) {
  const [main, setMain] = useState(defaultMain ?? "");
  const [related, setRelated] = useState<string[]>(defaultRelated);
  const [mainPending, setMainPending] = useState(false);
  const [relatedPending, setRelatedPending] = useState(0);
  const [error, setError] = useState<string>();
  const [broken, setBroken] = useState<string[]>([]);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const mainInput = useRef<HTMLInputElement>(null);
  const relatedInput = useRef<HTMLInputElement>(null);

  const freeSlots = MAX_RELATED_IMAGES - related.length - relatedPending;
  const uploading = mainPending || relatedPending > 0;
  const markBroken = (url: string) => setBroken((urls) => (urls.includes(url) ? urls : [...urls, url]));

  async function uploadMain(file: File) {
    setError(undefined);
    setMainPending(true);
    const result = await uploadImage(file, "product");
    setMainPending(false);
    if ("error" in result) return setError(result.error);
    setMain(result.url);
  }

  async function uploadRelated(files: File[]) {
    setError(undefined);
    const batch = files.slice(0, Math.max(0, freeSlots));
    const skipped = files.length - batch.length;
    if (batch.length === 0) {
      if (skipped) setError(`A product keeps up to ${MAX_RELATED_IMAGES} related images.`);
      return;
    }
    setRelatedPending((count) => count + batch.length);
    // In parallel, but added in the order they were chosen.
    const results = await Promise.all(batch.map((file) => uploadImage(file, "product")));
    setRelatedPending((count) => count - batch.length);
    const urls = results.flatMap((result) => ("url" in result ? [result.url] : []));
    setRelated((rows) => [...rows, ...urls.filter((url) => !rows.includes(url))].slice(0, MAX_RELATED_IMAGES));

    const failed = results.flatMap((result) => ("error" in result ? [result.error] : []));
    if (failed.length) setError(failed.length === 1 ? failed[0] : `${failed.length} images were not added: ${failed[0]}`);
    else if (skipped) setError(`A product keeps up to ${MAX_RELATED_IMAGES} related images; ${skipped} not added.`);
  }

  /** The related picture becomes the main one; the old main one takes its place. */
  function makeMain(url: string) {
    setRelated((rows) => {
      const next = [...rows];
      const index = next.indexOf(url);
      if (index < 0) return rows;
      if (main) next[index] = main;
      else next.splice(index, 1);
      return next;
    });
    setMain(url);
  }

  function dragProps(target: DropTarget, onFiles: (files: File[]) => void) {
    return {
      onDragOver: (event: DragEvent) => {
        event.preventDefault();
        setDropTarget(target);
      },
      onDragLeave: () => setDropTarget(null),
      onDrop: (event: DragEvent) => {
        setDropTarget(null);
        const files = droppedFiles(event);
        if (files.length) onFiles(files);
      },
    };
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-white/[0.02]",
        className,
      )}
    >
      {/* Main image */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span id="product-main-image-label" className="text-sm font-medium text-gray-700 dark:text-gray-400">
            Main image
          </span>
          {main && !mainPending && (
            <span className="flex items-center gap-3 text-xs font-medium">
              <button type="button" onClick={() => mainInput.current?.click()} className="text-brand-500 hover:underline">
                Change
              </button>
              <button type="button" onClick={() => setMain("")} className="text-red-600 hover:underline dark:text-red-400">
                Remove
              </button>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => mainInput.current?.click()}
          disabled={mainPending}
          aria-labelledby="product-main-image-label"
          title={main ? "Click or drop a file to change the main image" : "Click or drop a file to upload the main image"}
          {...dragProps("main", (files) => {
            void uploadMain(files[0]);
            // Several files dropped here: the first is the main image, the rest are related ones.
            if (files.length > 1) void uploadRelated(files.slice(1));
          })}
          className={cn(
            "relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white transition dark:bg-gray-900",
            dropTarget === "main"
              ? "border-brand-500 ring-3 ring-brand-500/10"
              : main
                ? "border-gray-200 hover:border-brand-300 dark:border-gray-800"
                : "border-dashed border-gray-300 hover:border-brand-400 dark:border-gray-700",
          )}
        >
          {main && !broken.includes(main) ? (
            // A file on the API (or another site): next/image would need each host configured.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={main} alt={alt} className="size-full object-contain" onError={() => markBroken(main)} />
          ) : main ? (
            <span className="flex flex-col items-center gap-1 px-4 text-xs text-amber-600 dark:text-amber-400">
              <ImageIcon className="size-6" aria-hidden />
              The image at this address can&apos;t be shown.
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-4 text-xs text-gray-500 dark:text-gray-400">
              <Upload className="size-6 text-gray-400 dark:text-gray-500" aria-hidden />
              <span>
                <span className="font-medium text-brand-500">Upload</span> or drop the main image
              </span>
            </span>
          )}
          {mainPending && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
              <Loader2 className="size-6 animate-spin text-brand-500" aria-label="Uploading" />
            </span>
          )}
        </button>
      </div>

      {/* Related images */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Related images</span>
          <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
            {related.length}/{MAX_RELATED_IMAGES}
          </span>
        </div>
        <div
          {...dragProps("related", (files) => void uploadRelated(files))}
          className={cn(
            "custom-scrollbar grid min-h-0 flex-1 auto-rows-min grid-cols-4 content-start gap-2 overflow-y-auto rounded-lg p-0.5",
            dropTarget === "related" && "bg-brand-50 ring-2 ring-brand-500/30 dark:bg-brand-500/10",
          )}
        >
          {related.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              {broken.includes(url) ? (
                <span className="flex size-full items-center justify-center" title="The image at this address can't be shown.">
                  <ImageIcon className="size-5 text-amber-500" aria-hidden />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`${alt} (${index + 1})`} className="size-full object-cover" onError={() => markBroken(url)} />
              )}
              <span className="absolute inset-x-0 top-0 flex justify-between p-0.5">
                <button
                  type="button"
                  onClick={() => makeMain(url)}
                  title="Make this the main image"
                  aria-label={`Make related image ${index + 1} the main image`}
                  className={cn(iconButton, "hover:text-brand-600")}
                >
                  <Star className="size-3" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setRelated((rows) => rows.filter((item) => item !== url))}
                  title="Remove"
                  aria-label={`Remove related image ${index + 1}`}
                  className={cn(iconButton, "hover:text-red-600")}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            </div>
          ))}
          {Array.from({ length: relatedPending }, (_, index) => (
            <div
              key={`pending-${index}`}
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <Loader2 className="size-5 animate-spin text-brand-500" aria-label="Uploading" />
            </div>
          ))}
          {freeSlots > 0 && (
            <button
              type="button"
              onClick={() => relatedInput.current?.click()}
              title="Add related images (you can pick or drop several)"
              className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 bg-white text-[11px] font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              <ImagePlus className="size-5" aria-hidden />
              Add
            </button>
          )}
        </div>
      </div>

      <p
        className="text-[11px] leading-4 text-gray-500 dark:text-gray-400"
        title="Pick or drop several files at once. The star on a related image makes it the main image."
      >
        JPG, PNG, WEBP, GIF or AVIF · up to {MAX_UPLOAD_MB} MB each
      </p>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <FieldError name="imageUrl" />
      <FieldError name="relatedImages" />

      <input
        ref={mainInput}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void uploadMain(file);
        }}
      />
      <input
        ref={relatedInput}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) void uploadRelated(files);
        }}
      />
      <input type="hidden" name="imageUrl" value={main} />
      <input type="hidden" name="relatedImages" value={JSON.stringify(related.map((url) => ({ url })))} />
      {/* Saving mid-upload would drop the picture: hold the submit (the browser shows the message here). */}
      {uploading && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value=""
          onChange={() => {}}
          ref={(input) => input?.setCustomValidity("Wait until the images finish uploading.")}
          className="sr-only"
        />
      )}
    </div>
  );
}
