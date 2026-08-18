import { workspaceLinkTone } from "@/features/partner/components/ui"
import { cn } from "@/lib/shared/utils"

export function PartnerSupportCard() {
  return (
    <div className="rounded-xl border border-[var(--ironhub-line)] bg-muted/20 p-4 text-xs text-muted-foreground">
      <span className="text-sm font-medium text-foreground">Need Assistance?</span>
      <p className="mt-1">
        Reach out to IronHub support at{" "}
        <a
          href="mailto:support@ironhub.com"
          className={cn("font-medium hover:underline", workspaceLinkTone)}
        >
          support@ironhub.com
        </a>
      </p>
    </div>
  )
}
