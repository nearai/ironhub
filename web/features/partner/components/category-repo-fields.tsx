"use client"

import { useId } from "react"

import { CATEGORIES } from "@/lib/catalog/inference"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

/**
 * Category + repository link fields shared by the create form and both edit
 * forms. `CATEGORIES` is the single source of truth (web/lib/catalog/inference.ts)
 * — never redefine the list here.
 *
 * Styling follows the workspace rules in the redesign's design.md D2: sentence-case
 * labels at body size, `rounded-lg` controls, and a 40px minimum control height so the
 * fields stay usable at phone width. The grid stacks below `sm` for the same reason.
 */
export function CategoryAndRepoFields({
  category,
  onCategoryChange,
  categoryError,
  sourceUrl,
  onSourceUrlChange,
  sourceUrlError,
}: {
  category: string
  onCategoryChange: (value: string) => void
  categoryError: string | null
  sourceUrl: string
  onSourceUrlChange: (value: string) => void
  sourceUrlError: string | null
}) {
  const categoryId = useId()
  const sourceUrlId = useId()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={categoryId} className="text-sm font-medium text-foreground">
          Category
        </label>
        <NativeSelect
          id={categoryId}
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-invalid={Boolean(categoryError)}
          className="w-full"
          selectClassName="h-10 rounded-lg"
        >
          <NativeSelectOption value="">Uncategorised</NativeSelectOption>
          {CATEGORIES.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {c}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <span className="text-xs text-muted-foreground">
          Helps your team find this later. You can change it any time.
        </span>
        {categoryError && (
          <span className="text-sm font-medium text-destructive">{categoryError}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={sourceUrlId} className="text-sm font-medium text-foreground">
          Source code link
        </label>
        <Input
          id={sourceUrlId}
          type="url"
          placeholder="https://github.com/org/repo"
          value={sourceUrl}
          onChange={(e) => onSourceUrlChange(e.target.value)}
          aria-invalid={Boolean(sourceUrlError)}
          className="h-10 rounded-lg bg-background/50 text-sm"
        />
        <span className="text-xs text-muted-foreground">
          Optional. Accepts a GitHub, GitLab, or Bitbucket URL.
        </span>
        {sourceUrlError && (
          <span className="text-sm font-medium text-destructive">{sourceUrlError}</span>
        )}
      </div>
    </div>
  )
}
