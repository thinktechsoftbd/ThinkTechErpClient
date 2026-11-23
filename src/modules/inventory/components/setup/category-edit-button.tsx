"use client";

import { FolderPen } from "lucide-react";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { saveCategoryAction } from "../../actions/setup";
import type { Category } from "../../types";
import { CategoryFields } from "./fields";

/**
 * A small icon beside a product row's category that opens the category's edit form (name, parent, ledger
 * head…), so a missing or wrong ledger head can be fixed from the product list. A client component, so the
 * category list it picks parents from goes to the browser once for all rows, not once per row.
 */
export function CategoryEditButton({
  category,
  categories,
}: {
  category: Category;
  /** Every category of the organization (one shared array), for the parent picker. */
  categories: Pick<Category, "id" | "path" | "isActive">[];
}) {
  const path = category.path || category.name;
  return (
    <FormModalButton
      mode="edit"
      iconOnly
      label={`Edit category ${path} and its ledger head`}
      title="Edit category"
      description={path}
      action={saveCategoryAction.bind(null, category.id)}
      submitLabel="Save changes"
      icon={<FolderPen className="size-3.5" aria-hidden />}
      triggerClassName="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-brand-50 hover:text-brand-500 dark:text-gray-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
    >
      <CategoryFields value={category} categories={categories} />
    </FormModalButton>
  );
}
