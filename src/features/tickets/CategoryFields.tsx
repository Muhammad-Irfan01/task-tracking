"use client";

import { Select } from "@/components/ui";
import type { FieldErrors } from "@/lib/schemas";
import type { TicketCategory } from "@/types";

interface CategoryFieldsProps {
  /** The chosen department's categories; nothing renders when it has none. */
  categories: TicketCategory[];
  category: string;
  subcategory: string;
  /** Picking a category also resets the sub-category, so both are reported together. */
  onChange: (category: string, subcategory: string) => void;
  errors?: FieldErrors;
}

/** Category, then the sub-categories of the chosen category. */
export function CategoryFields({ categories, category, subcategory, onChange, errors }: CategoryFieldsProps) {
  if (categories.length === 0) return null;
  const subcategories = categories.find((c) => c.name === category)?.subcategories ?? [];
  return (
    <>
      <Select label="Category" value={category} error={errors?.category} onChange={(e) => onChange(e.target.value, "")}>
        <option value="">Select a category…</option>
        {categories.map((c) => (
          <option key={c.name}>{c.name}</option>
        ))}
      </Select>
      <Select
        label="Sub-category"
        value={subcategory}
        error={errors?.subcategory}
        disabled={!category || subcategories.length === 0}
        onChange={(e) => onChange(category, e.target.value)}
      >
        <option value="">{category ? "Select a sub-category…" : "Choose a category first"}</option>
        {subcategories.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Select>
    </>
  );
}

/** Client-side mirror of the server rule: a category (and sub-category) is required when there are some. */
export function categoryErrors(categories: TicketCategory[], category: string, subcategory: string): FieldErrors | null {
  if (categories.length && !category) return { category: "Choose a category" };
  const subcategories = categories.find((c) => c.name === category)?.subcategories ?? [];
  if (subcategories.length && !subcategory) return { subcategory: "Choose a sub-category" };
  return null;
}
