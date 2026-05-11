import Link from "next/link"
import { IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

type ActionLinkProps = {
  href: string
  children: React.ReactNode
  external?: boolean
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}

export function ActionLink({
  href,
  children,
  external,
  variant = "outline",
  size,
}: ActionLinkProps) {
  if (external) {
    return (
      <Button asChild variant={variant} size={size}>
        <a href={href} target="_blank" rel="noreferrer">
          {children}
          <IconExternalLink />
        </a>
      </Button>
    )
  }

  return (
    <Button asChild variant={variant} size={size}>
      <Link href={href}>{children}</Link>
    </Button>
  )
}
