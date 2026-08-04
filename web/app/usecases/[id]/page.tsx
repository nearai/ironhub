import { getUseCaseById, getUseCases } from "@/lib/usecases/server"
import { HubLayout } from "@/features/shell/components/hub-layout"
import { CopyUsecaseButton } from "@/features/showcase/components/copy-usecase-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { StructuredData } from "@/components/structured-data"
import { buildUseCaseJsonLd } from "@/lib/discovery/json-ld"
import {
  buildPrivateMetadata,
  buildPublicMetadata,
  summarizeDescription,
} from "@/lib/discovery/metadata"
import {
  IconArrowLeft,
  IconChevronRight,
  IconChefHat,
  IconExternalLink,
  IconTools,
  IconMessageCircle,
  IconLayersLinked,
} from "@tabler/icons-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const useCases = await getUseCases()
  return useCases.map((uc) => ({
    id: uc.id,
  }))
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const useCase = await getUseCaseById(id)

  if (!useCase) {
    return buildPrivateMetadata("Use Case Not Found")
  }

  const path = `/usecases/${useCase.id}`

  return buildPublicMetadata({
    title: `${useCase.title} — IronClaw Use Case`,
    description:
      summarizeDescription(useCase.examplePrompt) ||
      `${useCase.title} community-built workflow for IronClaw.`,
    path,
    markdownPath: `${path}.md`,
    imagePath: `${path}/opengraph-image`,
    imageAlt: `${useCase.title} use case on IronHub`,
    type: "article",
  })
}

// Convert raw HTML img and anchor tags into markdown equivalents to prevent them from rendering as raw text
function convertRawHtmlTags(text: string): string {
  if (!text) return ""
  let result = text
  // Replace <img ... src="URL" ...> or <img src="URL" ...> with ![Image](URL)
  result = result.replace(/<img\s+[^>]*src="([^"]+)"[^>]*>/gi, "![Image]($1)")
  result = result.replace(/<img\s+[^>]*src='([^']+)'[^>]*>/gi, "![Image]($1)")
  // Replace <a ... href="URL" ...>Link Text</a> with [Link Text](URL)
  result = result.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
    "[$2]($1)"
  )
  result = result.replace(
    /<a\s+[^>]*href='([^']+)'[^>]*>(.*?)<\/a>/gi,
    "[$2]($1)"
  )
  return result
}

export default async function UseCaseDetailPage({ params }: PageProps) {
  const { id } = await params
  const useCase = await getUseCaseById(id)

  if (!useCase) {
    notFound()
  }

  // Filter out empty, unknown, N/A, or NA skill names
  const sanitizedSkills = useCase.skillsAndTools.filter((skill) => {
    if (!skill || !skill.name) return false
    const name = skill.name.trim().toLowerCase()
    return (
      name !== "" &&
      name !== "unknown" &&
      name !== "na" &&
      name !== "n/a" &&
      name !== "none"
    )
  })

  // Sanitize raw HTML tags to markdown
  const parsedAgentDoes = convertRawHtmlTags(useCase.agentDoes)

  return (
    <HubLayout>
      <StructuredData
        id="ironhub-usecase-jsonld"
        data={buildUseCaseJsonLd(useCase)}
      />
      <div className="w-full min-w-0 py-4">
        {/* Breadcrumbs & Back Navigation */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/usecases"
            className="flex items-center gap-1 font-semibold transition-colors hover:text-primary"
          >
            <IconArrowLeft className="size-4" />
            <span>Use Cases</span>
          </Link>
          <IconChevronRight className="size-3.5 opacity-60" />
          <span className="max-w-[200px] truncate font-semibold text-foreground sm:max-w-xs">
            {useCase.title}
          </span>
        </div>

        {/* Header Title and Categories (Flex Header block) */}
        <div className="mb-8 flex flex-col justify-between gap-6 border-b border-[var(--ironhub-line)]/50 pb-6 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              {useCase.categories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs font-medium tracking-[0.02em] text-[#0072c9] hover:bg-primary/15 dark:text-[#83dcff]"
                >
                  {category}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl leading-tight font-black tracking-tight text-foreground sm:text-4xl">
              {useCase.title}
            </h1>

            {/* Author and metadata */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {useCase.authorHandle && (
                <div className="flex items-center gap-2">
                  <IconChefHat className="size-5 animate-pulse text-muted-foreground/85" />
                  <span>
                    Recipe by{" "}
                    <span className="font-semibold text-foreground">
                      @{useCase.authorHandle}
                    </span>
                  </span>
                </div>
              )}
              {useCase.sourceUrl && (
                <a
                  href={useCase.sourceUrl}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center gap-1 font-semibold transition-colors hover:text-primary"
                >
                  <span>View Source Repository</span>
                  <IconExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>

          {/* Copy Usecase Action button */}
          <div className="w-full flex-shrink-0 md:w-auto">
            <CopyUsecaseButton useCase={useCase} />
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main Content (Left): Stacked how it works and example prompt */}
          <div className="min-w-0 space-y-6">
            {/* How it works detailed guide Card (First) */}
            <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-3 dark:bg-muted/15">
                <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase">
                  <IconLayersLinked className="size-4 text-primary" />
                  How it works
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ ...props }) => (
                        <h1
                          className="mt-6 mb-4 text-xl font-bold text-foreground"
                          {...props}
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h2
                          className="mt-5 mb-3 text-lg font-bold text-foreground"
                          {...props}
                        />
                      ),
                      h3: ({ ...props }) => (
                        <h3
                          className="mt-4 mb-2 text-base font-bold text-foreground"
                          {...props}
                        />
                      ),
                      p: ({ ...props }) => (
                        <p
                          className="mb-4 text-sm leading-relaxed text-muted-foreground"
                          {...props}
                        />
                      ),
                      ul: ({ ...props }) => (
                        <ul
                          className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground"
                          {...props}
                        />
                      ),
                      ol: ({ ...props }) => (
                        <ol
                          className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground"
                          {...props}
                        />
                      ),
                      li: ({ ...props }) => <li className="pl-1" {...props} />,
                      code: ({ children, ...props }) => (
                        <code
                          className="rounded-[5px] border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.8em] font-medium text-[#0072c9] dark:text-[#83dcff]"
                          {...props}
                        >
                          {children}
                        </code>
                      ),
                      pre: ({ ...props }) => (
                        <pre
                          className="selection-dark my-4 overflow-x-auto rounded-xl border border-white/10 bg-[var(--near-dark-grey)] p-4 font-mono text-xs text-white/90 [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-white/90"
                          {...props}
                        />
                      ),
                      img: ({ ...props }) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="my-6 h-auto max-w-full rounded-xl border border-[var(--ironhub-line)]/30 shadow-md"
                          alt={props.alt || "Use case instruction illustration"}
                          loading="lazy"
                          {...props}
                        />
                      ),
                      a: ({ href, children, ...props }) => (
                        <a
                          href={href}
                          className="font-medium text-primary hover:underline"
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          {...props}
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {parsedAgentDoes}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Example Prompt Card (Second) */}
            <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-3 dark:bg-muted/15">
                <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase">
                  <IconMessageCircle className="size-4 text-primary" />
                  Example Prompt
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="selection-dark rounded-[16px] rounded-tl-sm border border-white/10 bg-[var(--near-dark-grey)] p-5 text-white/90 shadow-md">
                  <p className="text-sm leading-relaxed tracking-tight whitespace-pre-wrap select-all sm:text-base">
                    &ldquo;{useCase.examplePrompt}&rdquo;
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar (Right) */}
          <aside className="relative z-10 min-w-0 space-y-6">
            {/* Skills and Tools List Card */}
            <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-3 dark:bg-muted/15">
                <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase">
                  <IconTools className="size-4 text-primary" />
                  Skills & Tools
                </h3>
              </div>
              <CardContent className="flex flex-col gap-4 p-5">
                <p className="text-xs leading-normal text-muted-foreground">
                  This usecase template requires the following capabilities to
                  run:
                </p>

                <div className="flex flex-col gap-2">
                  {sanitizedSkills.map((skill, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-1 rounded-xl border border-[var(--ironhub-line)]/40 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                    >
                      <span className="flex items-center justify-between text-sm font-semibold text-foreground">
                        {skill.name.replace(/`/g, "")}
                        {skill.isNew && (
                          <span className="rounded-sm border border-emerald-500/20 bg-emerald-500/10 px-1 text-[9px] font-extrabold text-emerald-600 uppercase dark:text-emerald-500">
                            New
                          </span>
                        )}
                      </span>
                      {skill.url ? (
                        <a
                          href={skill.url}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                        >
                          <span>Skill details</span>
                          <IconExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        <></>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </HubLayout>
  )
}
