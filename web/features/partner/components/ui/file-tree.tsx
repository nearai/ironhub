"use client"

import { IconFile, IconFolder } from "@tabler/icons-react"

import { formatBytes } from "@/lib/shared/format-utils"
import { cn } from "@/lib/shared/utils"

export interface FileTreeEntry {
  path: string
  sizeBytes: number
}

export type FileTreeNode =
  | { type: "file"; name: string; path: string; sizeBytes: number }
  | {
      type: "folder"
      name: string
      path: string
      fileCount: number
      children: FileTreeNode[]
    }

/**
 * Turns flat archive paths into the folder structure they describe.
 *
 * The paths are the only input on purpose: a zip may or may not carry
 * explicit directory records, so deriving folders from the file paths is the
 * one reading that gives the same tree either way.
 *
 * Folders sort before files and both sort by name, which is how every file
 * browser the reader has ever used orders a directory.
 */
export function buildFileTree(entries: FileTreeEntry[]): FileTreeNode[] {
  type FolderDraft = {
    node: Extract<FileTreeNode, { type: "folder" }>
    folders: Map<string, FolderDraft>
  }

  const rootChildren: FileTreeNode[] = []
  const rootFolders = new Map<string, FolderDraft>()

  for (const entry of entries) {
    const segments = entry.path.split("/").filter(Boolean)
    if (segments.length === 0) continue

    const fileName = segments[segments.length - 1]
    let children = rootChildren
    let folders = rootFolders
    let prefix = ""

    for (const segment of segments.slice(0, -1)) {
      prefix = prefix ? `${prefix}/${segment}` : segment
      let folder = folders.get(segment)
      if (!folder) {
        const node: Extract<FileTreeNode, { type: "folder" }> = {
          type: "folder",
          name: segment,
          path: prefix,
          fileCount: 0,
          children: [],
        }
        folder = { node, folders: new Map() }
        folders.set(segment, folder)
        children.push(node)
      }
      // Counted on every descendant, so a folder reports everything beneath
      // it rather than only its immediate children.
      folder.node.fileCount += 1
      children = folder.node.children
      folders = folder.folders
    }

    children.push({
      type: "file",
      name: fileName,
      path: entry.path,
      sizeBytes: entry.sizeBytes,
    })
  }

  const sort = (nodes: FileTreeNode[]): FileTreeNode[] => {
    nodes.sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1
    )
    for (const node of nodes) {
      if (node.type === "folder") sort(node.children)
    }
    return nodes
  }

  return sort(rootChildren)
}

function TreeRows({ nodes, depth }: { nodes: FileTreeNode[]; depth: number }) {
  return (
    <>
      {nodes.map((node) => (
        <li key={`${node.type}-${node.path}`}>
          <div
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-1.5",
              node.type === "folder" && "font-medium"
            )}
            // Indentation is inline because the depth is data, not one of a
            // fixed set of Tailwind steps -- a nested package would otherwise
            // need a class per level.
            style={{ paddingLeft: `${0.75 + depth * 1.125}rem` }}
          >
            <span className="flex min-w-0 items-center gap-2">
              {node.type === "folder" ? (
                <IconFolder
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <IconFile
                  className="size-4 shrink-0 text-muted-foreground/70"
                  aria-hidden="true"
                />
              )}
              <span className="truncate font-mono text-sm text-foreground">
                {node.name}
                {node.type === "folder" && "/"}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {node.type === "folder"
                ? `${node.fileCount} ${node.fileCount === 1 ? "file" : "files"}`
                : formatBytes(node.sizeBytes)}
            </span>
          </div>
          {node.type === "folder" && node.children.length > 0 && (
            <ul>
              <TreeRows nodes={node.children} depth={depth + 1} />
            </ul>
          )}
        </li>
      ))}
    </>
  )
}

export interface FileTreeProps {
  entries: FileTreeEntry[]
  /**
   * How many files to render before summarising the rest. A package may hold
   * up to 2000 entries (bundle.ts MAX_ENTRY_COUNT) and nobody reads that as a
   * list, but the count that was left out is always stated -- a silently
   * truncated listing reads as a complete one.
   */
  maxFiles?: number
  className?: string
}

export function FileTree({ entries, maxFiles = 120, className }: FileTreeProps) {
  const shown = entries.slice(0, maxFiles)
  const hidden = entries.length - shown.length

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--ironhub-line)] bg-background/50",
        className
      )}
    >
      <ul className="divide-y divide-[var(--ironhub-line)]/60 py-1">
        <TreeRows nodes={buildFileTree(shown)} depth={0} />
      </ul>
      {hidden > 0 && (
        <p className="border-t border-[var(--ironhub-line)] px-3 py-2 text-xs text-muted-foreground">
          and {hidden} more {hidden === 1 ? "file" : "files"} not listed here
        </p>
      )}
    </div>
  )
}
