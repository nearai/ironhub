import { Card, CardContent } from "@/components/ui/card"

type PageHeroProps = {
  eyebrow: string
  title: string
  description: string
  children?: React.ReactNode
}

export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  return (
    <Card className="overflow-hidden bg-primary/5">
      <CardContent className="relative p-6 sm:p-8">
        <div className="bg-primary/10 absolute top-8 right-8 hidden size-40 rounded-full blur-3xl lg:block" />
        <div className="relative max-w-4xl">
          <p className="text-primary text-xs font-semibold uppercase">
            {eyebrow}
          </p>
          <h1 className="font-heading mt-4 text-4xl font-semibold sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </div>
      </CardContent>
    </Card>
  )
}
