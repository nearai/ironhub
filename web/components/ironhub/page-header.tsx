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
    <header className="grid gap-4">
      <div>
        <p className="text-xs font-semibold text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-4xl font-heading text-3xl font-semibold sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </header>
  )
}
