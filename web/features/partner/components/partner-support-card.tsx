export function PartnerSupportCard() {
  return (
    <div className="mt-auto rounded-2xl border border-[var(--ironhub-line)] bg-muted/20 p-4 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">Need Assistance?</span>
      <p className="mt-1">
        Reach out to Near AI developer relations at{" "}
        <a
          href="mailto:devs@near.ai"
          className="font-medium text-primary hover:underline"
        >
          devs@near.ai
        </a>
      </p>
    </div>
  )
}
