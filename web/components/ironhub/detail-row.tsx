type DetailRowProps = {
  label: string
  value: string
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-semibold uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  )
}
