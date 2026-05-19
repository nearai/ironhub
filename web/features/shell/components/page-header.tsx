type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  children?: React.ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <header className="grid gap-3 rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 shadow-[var(--ironhub-shadow)] backdrop-blur-xl sm:gap-5 sm:p-6">
      <div>
        <p className="text-[9px] leading-none font-bold tracking-wider text-primary uppercase sm:text-xs">
          {eyebrow}
        </p>
        <h1 className="mt-1 max-w-4xl font-heading text-xl leading-tight font-bold sm:mt-3 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-sm sm:leading-6">
          {description}
        </p>
      </div>
      {children}
    </header>
  )
}
