"use client";

import { Award, X } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { cn } from "@/core/utils/cn";
import { MAX_PRODUCT_TAGS, MAX_TAG_NAME_LENGTH, type TagOption } from "../../types";

/** A tag the picker offers (from the inventory options) or a product already has. */
export type TagChoice = Pick<TagOption, "id" | "name" | "tagType" | "color">;

/** A picked tag; a new one (typed, not in the list) has no id until it is saved. */
type Picked = Omit<TagChoice, "id"> & { id: number | null };

/** The API's tag slug (InventoryRules.TagSlug): tags with the same slug are the same tag. */
export function tagSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

const cleanName = (raw: string) => raw.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_NAME_LENGTH);

/** Only plain colour values from the shared tag table end up in a style attribute. */
const safeColor = (color: string | null) => (color && /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(color) ? color : null);

/**
 * Tags as chips with a text box: pick a suggestion, or type a name and press Enter (or a comma) to add a
 * new tag. Website badges are marked. Submits `name` as JSON: [{ id, name }], id null for new tags.
 */
export function TagPicker({ id, name, options, defaultValue }: { id: string; name: string; options: TagChoice[]; defaultValue: TagChoice[] }) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>(defaultValue);
  const [text, setText] = useState("");

  const full = picked.length >= MAX_PRODUCT_TAGS;
  const pickedSlugs = new Set(picked.map((tag) => tagSlug(tag.name)));
  const available = options.filter((option) => !pickedSlugs.has(tagSlug(option.name)));

  function add(values: string[]) {
    setPicked((rows) => {
      const next = [...rows];
      for (const raw of values) {
        const value = cleanName(raw);
        const slug = tagSlug(value);
        if (!slug || next.length >= MAX_PRODUCT_TAGS || next.some((tag) => tagSlug(tag.name) === slug)) continue;
        // An existing tag with this name (or slug) is reused rather than created again.
        const existing =
          options.find((option) => option.name.toLowerCase() === value.toLowerCase()) ?? options.find((option) => tagSlug(option.name) === slug);
        next.push(existing ?? { id: null, name: value, tagType: "tag", color: null });
      }
      return next;
    });
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    const native = event.nativeEvent;
    // Choosing a suggestion replaces the text in one step (no InputEvent, or insertReplacementText).
    const chosen = !(native instanceof InputEvent) || native.inputType === "insertReplacementText";
    if (chosen && available.some((option) => option.name === value)) {
      add([value]);
      setText("");
    } else if (value.includes(",")) {
      // Typed or pasted commas separate tags; the text after the last one stays in the box.
      const parts = value.split(",");
      add(parts.slice(0, -1));
      setText(parts.at(-1) ?? "");
    } else {
      setText(value);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Never submit the form from here.
      event.preventDefault();
      if (text.trim()) {
        add([text]);
        setText("");
      }
    } else if (event.key === "Backspace" && !text && picked.length) {
      setPicked((rows) => rows.slice(0, -1));
    }
  }

  return (
    <>
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) input.current?.focus();
        }}
        className={cn(
          "flex min-h-9 w-full cursor-text flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-transparent px-1.5 py-1 shadow-theme-xs",
          "focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-brand-800",
        )}
      >
        {picked.map((tag) => {
          const color = safeColor(tag.color);
          return (
            <span
              key={tagSlug(tag.name)}
              title={tag.tagType === "badge" ? "Website badge" : tag.id === null ? "New tag, created when you save" : undefined}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pr-0.5 pl-2 text-xs font-medium",
                tag.tagType === "badge"
                  ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200 ring-inset dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                  : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
              )}
            >
              {color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />}
              {tag.tagType === "badge" && <Award className="size-3 shrink-0" aria-hidden />}
              <span className="truncate">{tag.name}</span>
              {tag.id === null && <span className="text-[10px] font-normal opacity-70">new</span>}
              <button
                type="button"
                onClick={() => setPicked((rows) => rows.filter((row) => row !== tag))}
                aria-label={`Remove tag ${tag.name}`}
                className="rounded p-0.5 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          );
        })}
        <input
          ref={input}
          id={id}
          list={listId}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // A typed tag isn't lost when the user moves on without pressing Enter.
            if (text.trim()) {
              add([text]);
              setText("");
            }
          }}
          maxLength={MAX_TAG_NAME_LENGTH}
          disabled={full}
          autoComplete="off"
          placeholder={full ? `Up to ${MAX_PRODUCT_TAGS} tags` : picked.length ? "Add another…" : "Type a tag and press Enter, or pick one"}
          className="h-7 min-w-40 flex-1 border-0 bg-transparent px-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-white/90 dark:placeholder:text-white/30"
        />
      </div>
      <datalist id={listId}>
        {available.map((option) => (
          <option key={option.id} value={option.name}>
            {option.tagType === "badge" ? "Website badge" : undefined}
          </option>
        ))}
      </datalist>
      <input type="hidden" name={name} value={JSON.stringify(picked.map((tag) => ({ id: tag.id, name: tag.name })))} />
    </>
  );
}
