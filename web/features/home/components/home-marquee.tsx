type HomeMarqueeProps = {
  total: number
  skills: number
  tools: number
}

export function HomeMarquee({ total, skills, tools }: HomeMarqueeProps) {
  const items = [
    `${total.toLocaleString("en-US")} extensions indexed`,
    `${skills} skills`,
    `${tools} wasm tools`,
    "repo-backed",
    "sandbox verified",
    "zero operator access",
    "hardware-enforced enclave",
    "source-first review",
  ]

  // Duplicate the sequence so the -50% translate loops seamlessly.
  const loop = [...items, ...items]

  return (
    <div
      className="ih-bleed overflow-hidden border-y border-black/10 bg-[var(--marquee-bg)] py-3 select-none"
      aria-hidden="true"
    >
      <div className="near-marquee-track">
        {loop.map((label, i) => (
          <span
            key={i}
            className="flex items-center font-mono text-xs tracking-wider text-[var(--marquee-fg)] uppercase"
          >
            <span className="px-6">{label}</span>
            <span className="text-[var(--marquee-fg)] opacity-30">|||</span>
          </span>
        ))}
      </div>
    </div>
  )
}
