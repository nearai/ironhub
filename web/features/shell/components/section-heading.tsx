type SectionHeadingProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

export function SectionHeading({
  title,
  description,
  action,
}: SectionHeadingProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[var(--ironhub-line)] bg-card/45 p-5 shadow-[var(--ironhub-shadow)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
