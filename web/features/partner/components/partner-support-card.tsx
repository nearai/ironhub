export function PartnerSupportCard() {
  return (
    <div className="rounded-xl border border-[var(--ironhub-line)] bg-muted/20 p-4 text-xs text-muted-foreground">
      <span className="text-sm font-medium text-foreground">Need Assistance?</span>
      <p className="mt-1">
        Reach out to IronHub support at{" "}
        <a
          href="mailto:support@ironhub.com"
          className="font-medium text-primary hover:underline"
        >
          support@ironhub.com
        </a>
      </p>
    </div>
  )
}
