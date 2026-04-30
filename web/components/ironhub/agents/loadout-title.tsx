import { Badge } from "@/components/ui/badge"

type LoadoutTitleProps = {
  title: string
  count: number
}

export function LoadoutTitle({ title, count }: LoadoutTitleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-medium">{title}</h3>
      <Badge variant="outline">{count}</Badge>
    </div>
  )
}
