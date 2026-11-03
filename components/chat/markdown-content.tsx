import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="text-base leading-relaxed space-y-2 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-3 mb-1 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mt-2.5 mb-1 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-normal">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 my-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 my-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            return isBlock ? (
              <pre className="my-2 overflow-x-auto rounded-lg bg-black/10 dark:bg-white/10 p-3 text-xs font-mono">
                <code>{children}</code>
              </pre>
            ) : (
              <code className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 text-xs font-mono">
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

