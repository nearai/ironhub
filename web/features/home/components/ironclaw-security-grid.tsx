import {
  IconBinaryTree,
  IconCloudLock,
  IconFingerprint,
  IconLockSquareRounded,
  IconNetwork,
  IconShieldLock,
} from "@tabler/icons-react"

const features = [
  {
    title: "Encrypted vault",
    description:
      "Credentials are stored outside the model path and injected only at approved host boundaries.",
    Icon: IconLockSquareRounded,
  },
  {
    title: "Wasm tool isolation",
    description:
      "Each tool advertises capabilities and runs as a narrow integration surface instead of a shared process.",
    Icon: IconBinaryTree,
  },
  {
    title: "Endpoint allowlists",
    description:
      "Network access is visible up front, so a skill cannot silently call unknown destinations.",
    Icon: IconNetwork,
  },
  {
    title: "TEE deployment context",
    description:
      "IronClaw positioning centers on encrypted enclaves for agents running on NEAR AI Cloud.",
    Icon: IconCloudLock,
  },
  {
    title: "Source-first review",
    description:
      "Cards link back to manifests, Rust actions, and SKILL.md files so operators can inspect behavior.",
    Icon: IconFingerprint,
  },
  {
    title: "Leak-aware defaults",
    description:
      "The experience keeps auth models, setup notes, and runtime limits visible before installation.",
    Icon: IconShieldLock,
  },
] as const

export function IronClawSecurityGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map(({ title, description, Icon }) => (
        <article
          key={title}
          className="rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary/45"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <h3 className="mt-5 font-heading text-xl font-semibold">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </article>
      ))}
    </section>
  )
}
