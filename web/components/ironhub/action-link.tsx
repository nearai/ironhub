import Link from "next/link"
import { IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

type ActionLinkProps = {
  href: string
  children: React.ReactNode
  external?: boolean
  variant?: React.ComponentProps<typeof Button>["variant"]
}

export function ActionLink({
  href,
  children,
  external,
  variant = "outline",
}: ActionLinkProps) {
  if (external) {
    return (
      <Button asChild variant={variant}>
        <a href={href} target="_blank" rel="noreferrer">
          {children}
          <IconExternalLink />
        </a>
      </Button>
    )
  }

  return (
    <Button asChild variant={variant}>
      <Link href={href}>{children}</Link>
    </Button>
  )
}
