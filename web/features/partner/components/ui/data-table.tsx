"use client"

import * as React from "react"
import { cn } from "@/lib/shared/utils"

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  align?: "left" | "right"
  headerClassName?: string
  cellClassName?: string
  srOnlyHeader?: boolean // for the actions column
  wrap?: boolean // opt out of single-line nowrap truncation for multi-line cells
  maxWidth?: string // plain CSS length (e.g. "14rem") or "none" to opt out; defaults to "16rem" when wrap is not set
}

/**
 * Row navigation is done by making the Name cell a link, not by a
 * row-level click handler.
 */
export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: React.ReactNode // rendered instead of <tbody> rows and suppresses <thead> when rows.length === 0
  caption?: string // visually hidden <caption>
  minWidth?: string // plain CSS length string (e.g. "48rem"), only applied when rows.length > 0; default "48rem"
  maxHeight?: string // plain CSS length string (e.g. "32rem"); setting it enables vertical scrolling and makes stickyHeader take effect
  stickyHeader?: boolean // default true; has no effect unless maxHeight is also set
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  caption,
  minWidth = "48rem",
  maxHeight,
  stickyHeader = true,
  className,
}: DataTableProps<T>): React.ReactElement {
  const isSticky = Boolean(stickyHeader && maxHeight)
  // When rows are empty and an empty state is provided, omit <thead> so intrinsic
  // column header widths do not cause horizontal scrolling on mobile viewports.
  const showHeader = rows.length > 0 || empty === undefined

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--ironhub-line)] bg-card shadow-[var(--ironhub-shadow)]",
        className
      )}
    >
      <div
        style={maxHeight ? { maxHeight } : undefined}
        className={cn(
          "overflow-x-auto",
          maxHeight && "overflow-y-auto"
        )}
      >
        <table
          style={rows.length > 0 ? { minWidth } : undefined}
          className="w-full border-collapse text-sm"
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          {showHeader && (
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "bg-card px-3 py-3 text-xs font-medium text-muted-foreground border-b border-[var(--ironhub-line)]",
                      isSticky && "sticky top-0 z-10",
                      column.align === "right" ? "text-right" : "text-left",
                      column.headerClassName
                    )}
                  >
                    {column.srOnlyHeader ? (
                      <span className="sr-only">{column.header}</span>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length === 0 ? (
              empty !== undefined ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    {empty}
                  </td>
                </tr>
              ) : null
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-t border-[var(--ironhub-line)] transition-colors hover:bg-muted/40"
                >
                  {columns.map((column) => {
                    const effectiveMaxWidth =
                      column.wrap || column.maxWidth === "none"
                        ? undefined
                        : (column.maxWidth ?? "16rem")

                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "px-3 py-3 align-middle text-sm text-foreground",
                          !column.wrap && "whitespace-nowrap",
                          column.align === "right" ? "text-right" : "text-left"
                        )}
                      >
                        <div
                          style={
                            effectiveMaxWidth
                              ? { maxWidth: effectiveMaxWidth }
                              : undefined
                          }
                          className={cn(
                            column.wrap ? "min-w-0" : "truncate",
                            column.cellClassName
                          )}
                        >
                          {column.cell(row)}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
