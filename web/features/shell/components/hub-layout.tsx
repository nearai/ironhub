import Image from "next/image"

type HubLayoutProps = {
  children: React.ReactNode
  fluid?: boolean
}

export function HubLayout({ children, fluid }: HubLayoutProps) {
  return (
    <div className="ih-home-wrapper">
      <main
        className={
          fluid
            ? "relative z-10 w-full"
            : "relative z-10 mx-auto max-w-7xl px-4 pt-6 pb-7 sm:px-6 sm:py-7 lg:px-4"
        }
      >
        {children}
      </main>
      <Image
        src="/ironclaw.png"
        alt=""
        aria-hidden="true"
        width={480}
        height={480}
        className="pointer-events-none fixed right-0 bottom-0 z-0 h-auto w-[260px] opacity-70 select-none sm:w-[340px] lg:w-[480px]"
        style={{ filter: "drop-shadow(var(--ih-shadow))" }}
      />
    </div>
  )
}
