import { getUseCaseById, getUseCases } from "@/lib/usecases/server"
import { HubLayout } from "@/features/shell/components/hub-layout"
import { CopyUsecaseButton } from "@/features/showcase/components/copy-usecase-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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
    return {
      title: "Use Case Not Found - IronClaw Showcase",
    }
  }

  return {
    title: `${useCase.title} - IronClaw Use Case`,
    description: `${useCase.title} community-built agent configuration and workflow prompt template for IronClaw.`,
  }
}

// Convert raw HTML img and anchor tags into markdown equivalents to prevent them from rendering as raw text
function convertRawHtmlTags(text: string): string {
  if (!text) return ""
  let result = text
  // Replace <img ... src="URL" ...> or <img src="URL" ...> with ![Image](URL)
  result = result.replace(/<img\s+[^>]*src="([^"]+)"[^>]*>/gi, '![Image]($1)')
  result = result.replace(/<img\s+[^>]*src='([^']+)'[^>]*>/gi, '![Image]($1)')
  // Replace <a ... href="URL" ...>Link Text</a> with [Link Text](URL)
  result = result.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
  result = result.replace(/<a\s+[^>]*href='([^']+)'[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
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
    return name !== "" && name !== "unknown" && name !== "na" && name !== "n/a" && name !== "none"
  })

  // Sanitize raw HTML tags to markdown
  const parsedAgentDoes = convertRawHtmlTags(useCase.agentDoes)

  return (
    <HubLayout>
      <div className="w-full py-4 min-w-0">
        {/* Breadcrumbs & Back Navigation */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/usecases" className="hover:text-primary transition-colors flex items-center gap-1 font-semibold">
            <IconArrowLeft className="size-4" />
            <span>Use Cases</span>
          </Link>
          <IconChevronRight className="size-3.5 opacity-60" />
          <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-xs">{useCase.title}</span>
        </div>

        {/* Header Title and Categories (Flex Header block) */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-[var(--ironhub-line)]/50 pb-6">
          <div className="flex flex-col gap-3.5 flex-1 min-w-0">
            <div className="flex flex-wrap gap-2">
              {useCase.categories.map((category) => (
                <Badge key={category} variant="secondary" className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs font-medium tracking-[0.02em] text-[#0072c9] hover:bg-primary/15 dark:text-[#83dcff]">
                  {category}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
              {useCase.title}
            </h1>
            
            {/* Author and metadata */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {useCase.authorHandle && (
                <div className="flex items-center gap-2">
                  <IconChefHat className="size-5 text-muted-foreground/85 animate-pulse" />
                  <span>Recipe by <span className="font-semibold text-foreground">@{useCase.authorHandle}</span></span>
                </div>
              )}
              {useCase.sourceUrl && (
                <a 
                  href={useCase.sourceUrl} 
                  target="_blank" 
                  rel="nofollow noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                >
                  <span>View Source Repository</span>
                  <IconExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>

          {/* Copy Usecase Action button */}
          <div className="flex-shrink-0 w-full md:w-auto">
            <CopyUsecaseButton useCase={useCase} />
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          {/* Main Content (Left): Stacked how it works and example prompt */}
          <div className="space-y-6 min-w-0">
            {/* How it works detailed guide Card (First) */}
            <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-3 dark:bg-muted/15">
                <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase flex items-center gap-1.5">
                  <IconLayersLinked className="size-4 text-primary" />
                  How it works
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ ...props }) => <h1 className="text-xl font-bold mt-6 mb-4 text-foreground" {...props} />,
                      h2: ({ ...props }) => <h2 className="text-lg font-bold mt-5 mb-3 text-foreground" {...props} />,
                      h3: ({ ...props }) => <h3 className="text-base font-bold mt-4 mb-2 text-foreground" {...props} />,
                      p: ({ ...props }) => <p className="text-muted-foreground leading-relaxed mb-4 text-sm" {...props} />,
                      ul: ({ ...props }) => <ul className="list-disc pl-5 mb-4 text-sm space-y-1.5 text-muted-foreground" {...props} />,
                      ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-4 text-sm space-y-1.5 text-muted-foreground" {...props} />,
                      li: ({ ...props }) => <li className="pl-1" {...props} />,
                      code: ({ className, children, ...props }) => (
                        <code className="rounded-[5px] border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.8em] font-medium text-[#0072c9] dark:text-[#83dcff]" {...props}>
                          {children}
                        </code>
                      ),
                      pre: ({ ...props }) => (
                        <pre className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-[var(--near-dark-grey)] p-4 text-xs font-mono text-white/90 selection-dark [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-white/90" {...props} />
                      ),
                      img: ({ ...props }) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          className="rounded-xl border border-[var(--ironhub-line)]/30 my-6 max-w-full h-auto shadow-md" 
                          alt={props.alt || "Use case instruction illustration"} 
                          loading="lazy"
                          {...props} 
                        />
                      ),
                      a: ({ href, children, ...props }) => (
                        <a 
                          href={href}
                          className="text-primary hover:underline font-medium" 
                          target="_blank" 
                          rel="nofollow noopener noreferrer"
                          {...props}
                        >
                          {children}
                        </a>
                      )
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
                <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase flex items-center gap-1.5">
                  <IconMessageCircle className="size-4 text-primary" />
                  Example Prompt
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="rounded-[16px] rounded-tl-sm border border-white/10 bg-[var(--near-dark-grey)] p-5 text-white/90 shadow-md selection-dark">
                  <p className="text-sm leading-relaxed tracking-tight whitespace-pre-wrap select-all sm:text-base">
                    &ldquo;{useCase.examplePrompt}&rdquo;
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar (Right) */}
          <aside className="space-y-6 min-w-0 relative z-10">
            {/* Skills and Tools List Card */}
            <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-3 dark:bg-muted/15">
                <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase flex items-center gap-1.5">
                  <IconTools className="size-4 text-primary" />
                  Skills & Tools
                </h3>
              </div>
              <CardContent className="p-5 flex flex-col gap-4">
                <p className="text-xs text-muted-foreground leading-normal">
                  This usecase template requires the following capabilities to run:
                </p>

                <div className="flex flex-col gap-2">
                  {sanitizedSkills.map((skill, index) => (
                    <div 
                      key={index}
                      className="flex flex-col gap-1 p-3 rounded-xl border border-[var(--ironhub-line)]/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-sm font-semibold text-foreground flex items-center justify-between">
                        {skill.name.replace(/`/g, "")}
                        {skill.isNew && (
                          <span className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-1 rounded-sm border border-emerald-500/20">New</span>
                        )}
                      </span>
                      {skill.url ? (
                        <a 
                          href={skill.url}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5 mt-0.5"
                        >
                          <span>Skill details</span>
                          <IconExternalLink className="size-2.5" />
                        </a>
                      ) : (<></>)}
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
