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
            <h1 className="text-2xl font-bold text-foreground mt-8 first:mt-0 mb-4">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mt-6 first:mt-0 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-foreground mt-4 first:mt-0 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                {children}
              </code>
            ) : (
              <pre className="p-4 rounded-lg bg-muted overflow-x-auto my-4">
                <code className={className}>{children}</code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/20 pl-4 italic my-4">
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
            <div className="my-6 w-full overflow-x-auto rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/20">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/10 transition-colors duration-150 ease-in-out">
              {children}
            </tr>
          ),
          th: ({ children, style }) => (
            <th className="px-4 py-3 font-semibold text-foreground" style={style}>
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td className="px-4 py-3 text-muted-foreground align-middle whitespace-pre-wrap" style={style}>
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

