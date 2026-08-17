"use client"

import { IconCategory, IconLink } from "@tabler/icons-react"

import { CATEGORIES } from "@/lib/catalog/inference"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

/**
 * Category + repository link fields shared by the create form and both edit
 * forms. `CATEGORIES` is the single source of truth (web/lib/catalog/inference.ts)
 * — never redefine the list here.
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
  return (
    <div className="grid gap-4 sm:grid-cols-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
          <IconCategory className="size-3.5" />
          Category
        </label>
        <NativeSelect
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-invalid={Boolean(categoryError)}
          className="w-full rounded-full select-none"
        >
          <NativeSelectOption value="">Uncategorised</NativeSelectOption>
          {CATEGORIES.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {c}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {categoryError && (
          <span className="text-xs font-semibold text-destructive">{categoryError}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
          <IconLink className="size-3.5" />
          Repository Link
        </label>
        <Input
          type="url"
          placeholder="https://github.com/org/repo"
          value={sourceUrl}
          onChange={(e) => onSourceUrlChange(e.target.value)}
          aria-invalid={Boolean(sourceUrlError)}
          className="bg-background/50 text-sm rounded-full"
        />
        <span className="text-xs text-muted-foreground">
          Optional. Accepts a GitHub, GitLab, or Bitbucket URL.
        </span>
        {sourceUrlError && (
          <span className="text-xs font-semibold text-destructive">{sourceUrlError}</span>
        )}
      </div>
    </div>
  )
}
