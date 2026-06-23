export function HomeTrustBand() {
  return (
    <section className="ih-bleed bg-[image:var(--trust-bg)] text-white">
      <div className="ih-container py-16 sm:py-20">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="font-mono text-[var(--fs-eyebrow)] font-semibold tracking-[0.22em] text-white/70 uppercase">
              Trust Foundation
            </p>
            <h2 className="mt-4 text-3xl leading-[1.08] font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Every extension runs inside a hardware-enforced enclave.
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 font-mono text-xs tracking-widest text-white/70 uppercase">
            Built on
            <span className="font-sans text-base font-bold tracking-tight text-white normal-case">
              near<span className="text-[var(--near-sky)]"> AI</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
