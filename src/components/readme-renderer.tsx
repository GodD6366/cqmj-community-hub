import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  if (!href) {
    return <span>{children}</span>;
  }

  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-800"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-800">
      {children}
    </Link>
  );
}

export function ReadmeRenderer({ markdown }: { markdown: string }) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-6 text-[2rem] leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 mb-4 border-t border-slate-200 pt-6 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 mb-3 text-lg font-semibold text-slate-900 sm:text-xl">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-6 mb-3 text-base font-semibold text-slate-900 sm:text-lg">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="mt-4 mb-2 text-base font-semibold text-slate-900">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="mt-4 mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="my-4 text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-8">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700 marker:text-slate-400 sm:pl-6 sm:text-base sm:leading-8">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-slate-700 marker:font-medium marker:text-slate-500 sm:pl-6 sm:text-base sm:leading-8">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
          strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
          code: ({ className, children }) => {
            const isBlock = Boolean(className);

            if (!isBlock) {
              return (
                <code className="break-words rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.95em] text-slate-900">
                  {children}
                </code>
              );
            }

            return (
              <code className="font-mono text-sm leading-7 text-slate-100">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-6 overflow-x-auto rounded-[1.25rem] bg-slate-950 p-4 text-xs leading-6 text-slate-100 sm:rounded-[1.5rem] sm:p-5 sm:text-sm sm:leading-7">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-6 rounded-r-2xl border-l-4 border-sky-300 bg-sky-50/70 px-4 py-3 text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-8">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-slate-200" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
