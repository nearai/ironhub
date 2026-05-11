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
    <header className="grid gap-3 sm:gap-5 rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 sm:p-6 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
      <div>
        <p className="text-[9px] sm:text-xs font-bold tracking-wider text-primary uppercase leading-none">
          {eyebrow}
        </p>
        <h1 className="mt-1 sm:mt-3 max-w-4xl font-heading text-xl font-bold sm:text-4xl leading-tight">
          {title}
        </h1>
        <p className="mt-1 sm:mt-3 max-w-2xl text-[11px] sm:text-sm leading-relaxed sm:leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </header>
  )
}
