import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type MarkdownViewProps = {
  content: string
}

export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <div className="space-y-4 text-sm leading-7 text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 mb-4 text-2xl font-bold text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-3 text-xl font-semibold text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-lg font-medium text-foreground first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-4 list-disc space-y-2 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal space-y-2 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {children}
              </code>
            ) : (
              <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4">
                <code className={className}>{children}</code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-primary/20 pl-4 italic">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-6 w-full overflow-x-auto rounded-xl border border-border/40 bg-card/30 shadow-sm backdrop-blur-sm">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border/40 bg-muted/50 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/20">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition-colors duration-150 ease-in-out hover:bg-muted/10">
              {children}
            </tr>
          ),
          th: ({ children, style }) => (
            <th
              className="px-4 py-3 font-semibold text-foreground"
              style={style}
            >
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td
              className="px-4 py-3 align-middle whitespace-pre-wrap text-muted-foreground"
              style={style}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
