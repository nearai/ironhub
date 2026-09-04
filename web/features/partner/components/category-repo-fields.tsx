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
 * `includeSourceUrl={false}` drops the repository link and gives the category
 * the full width. It exists for the loadout forms: a loadout is composed inside
 * the hub out of members that each already carry their own link, so a
 * repository link on the loadout itself would either duplicate one member's or
 * point at nothing (add-private-loadouts design.md -- "A loadout has no source
 * repository"). Opt-out rather than opt-in so the five call sites that do want
 * the field are untouched.
 *
 * Styling follows the workspace rules in the redesign's design.md D2: sentence-case
 * labels at body size, `rounded-lg` controls, and a 40px minimum control height so the
 * fields stay usable at phone width. The grid stacks below `sm` for the same reason.
 */
/**
 * A union rather than optional props, so the compiler enforces the pairing:
 * omitting `includeSourceUrl` still requires the three source-url props, and
 * passing `false` refuses them instead of silently ignoring what a caller
 * threaded through.
 */
export type CategoryAndRepoFieldsProps = {
  category: string
  onCategoryChange: (value: string) => void
  categoryError: string | null
} & (
  | {
      includeSourceUrl?: true
      sourceUrl: string
      onSourceUrlChange: (value: string) => void
      sourceUrlError: string | null
    }
  | {
      includeSourceUrl: false
      sourceUrl?: never
      onSourceUrlChange?: never
      sourceUrlError?: never
    }
)

export function CategoryAndRepoFields(props: CategoryAndRepoFieldsProps) {
  const { category, onCategoryChange, categoryError } = props
  const includeSourceUrl = props.includeSourceUrl ?? true
  const categoryId = useId()
  const sourceUrlId = useId()

  return (
    <div
      className={
        includeSourceUrl ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"
      }
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={categoryId}
          className="text-sm font-medium text-foreground"
        >
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
          <span className="text-sm font-medium text-destructive">
            {categoryError}
          </span>
        )}
      </div>

      {includeSourceUrl && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={sourceUrlId}
            className="text-sm font-medium text-foreground"
          >
            Source code link
          </label>
          <Input
            id={sourceUrlId}
            type="url"
            placeholder="https://github.com/org/repo"
            value={props.sourceUrl ?? ""}
            onChange={(e) => props.onSourceUrlChange?.(e.target.value)}
            aria-invalid={Boolean(props.sourceUrlError)}
            className="h-10 rounded-lg bg-background/50 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Optional. Accepts a GitHub, GitLab, or Bitbucket URL.
          </span>
          {props.sourceUrlError && (
            <span className="text-sm font-medium text-destructive">
              {props.sourceUrlError}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
