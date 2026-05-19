const steps = [
  ["Hub signs", "IronHub builds the message and signs with HMAC-SHA256."],
  ["Agent verifies", "IronClaw verifies signature, ts, and nonce."],
  ["User confirms", "Valid intent shows confirm card with manifest data."],
  [
    "Phase 3 install",
    "User clicks Install and proceeds through Phase 3 endpoint.",
  ],
]

export function InstallFlowSteps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {steps.map(([title, body], index) => (
        <li key={title} className="relative grid gap-3 text-center">
          {index < steps.length - 1 ? (
            <span className="absolute top-4 left-1/2 hidden h-px w-full border-t border-dashed border-primary/35 sm:block" />
          ) : null}
          <span className="relative z-10 mx-auto grid size-9 place-items-center rounded-full border border-primary/35 bg-primary/10 font-heading text-lg font-semibold text-primary">
            {index + 1}
          </span>
          <div className="grid gap-2">
            <h3 className="font-heading text-sm font-semibold">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
