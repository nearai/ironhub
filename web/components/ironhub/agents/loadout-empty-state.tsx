type LoadoutEmptyStateProps = {
  message: string
}

export function LoadoutEmptyState({ message }: LoadoutEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
