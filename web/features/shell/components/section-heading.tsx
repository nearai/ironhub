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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
