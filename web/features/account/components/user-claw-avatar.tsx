import Image from "next/image"

import { cn } from "@/lib/shared/utils"
import { getUserClawAvatarPath } from "../utils/user-claw-avatar"

type UserClawAvatarProps = {
  user: {
    id?: string | null
    email?: string | null
    name?: string | null
  }
  size: number
  className?: string
  imageClassName?: string
}

export function UserClawAvatar({
  user,
  size,
  className,
  imageClassName,
}: UserClawAvatarProps) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--ironhub-line)] bg-primary/10",
        className
      )}
      aria-hidden="true"
    >
      <Image
        src={getUserClawAvatarPath(user)}
        alt="claw avatar"
        width={size}
        height={size}
        className={cn("size-full object-contain", imageClassName)}
      />
    </span>
  )
}
