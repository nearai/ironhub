import Image from "next/image"

export function HomeTrustBand() {
  return (
    <section className="ih-bleed relative overflow-hidden border-t border-white/10 text-white">
      {/* focus-blue mesh background + darkening scrim (matches mockup) */}
      <div className="absolute inset-0 bg-[url('/assets/focus-blue.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-linear-to-b from-black/55 to-black/35" />

      <div className="ih-container relative py-16">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-[40rem]">
            <p className="font-mono text-[0.72rem] tracking-[0.18em] text-white/85 uppercase">
              Trust foundation
            </p>
            <h2 className="mt-3.5 text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.1] font-black tracking-[-0.02em]">
              Every extension runs inside a hardware-enforced enclave.
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="font-mono text-[0.74rem] tracking-[0.12em] text-white/80 uppercase">
              Built on
            </span>
            <Image
              src="/assets/near-ai-white.png"
              alt="NEAR AI"
              width={2160}
              height={845}
              className="h-[30px] w-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
