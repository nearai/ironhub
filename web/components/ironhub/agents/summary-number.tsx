type SummaryNumberProps = {
  label: string
  value: number
}

export function SummaryNumber({ label, value }: SummaryNumberProps) {
  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
