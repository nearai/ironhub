import Image from "next/image"

export function IronClawStackPanel() {
  return (
    <section className="grid gap-6 rounded-xl border bg-card p-5 shadow-sm lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
      <div className="flex flex-col justify-between gap-8">
        <div>
          <p className="text-xs font-semibold text-primary uppercase">
            How it fits together
          </p>
          <h2 className="font-heading mt-3 text-3xl font-semibold">
            Skills become safer when the boundaries are visible.
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The public IronClaw story is about giving agents useful access while
            keeping secrets out of prompts. IronHub turns that into an operator
            view: what the tool can call, how it authenticates, where its source
            lives, and what review status it carries.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["Manifest", "Capability", "Allowlist"].map((item) => (
            <div key={item} className="rounded-lg border bg-background/55 p-3">
              <p className="text-sm font-semibold">{item}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                checked before run
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative min-h-[320px] overflow-hidden rounded-lg border bg-background">
        <Image
          src="/assets/ironclaw-vault-diagram.svg"
          alt="IronClaw vault and sandbox boundary diagram"
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 46vw, 100vw"
        />
      </div>
    </section>
  )
}
