import Link from "next/link"
import { IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

type ActionLinkProps = {
  href: string
  children: React.ReactNode
  external?: boolean
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}

export function ActionLink({
  href,
  children,
  external,
  variant = "outline",
  size,
  className,
}: ActionLinkProps) {
  if (external) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <a href={href} target="_blank" rel="noreferrer">
          {children}
          <IconExternalLink />
        </a>
      </Button>
    )
  }

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={href}>{children}</Link>
    </Button>
  )
}
