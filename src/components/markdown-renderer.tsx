"use client";

import { isValidElement, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

type CodeProps = ComponentProps<"code"> & {
  inline?: boolean;
  node?: unknown;
};

function readText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => readText(child)).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return readText(node.props.children);
  }
  return "";
}

function readLanguage(className?: string) {
  return className?.match(/language-([a-zA-Z0-9_-]+)/)?.[1] ?? "text";
}

function CodeBlock({ className, children, ...props }: CodeProps) {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => readText(children).replace(/\n$/, ""), [children]);
  const language = readLanguage(className);

  async function copyCode() {
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-toolbar">
        <span>{language}</span>
        <button type="button" onClick={copyCode}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  h1: (props) => <h1 {...props} />,
  h2: (props) => <h2 {...props} />,
  h3: (props) => <h3 {...props} />,
  a: (props) => <a target="_blank" rel="noreferrer" {...props} />,
  code: ({ inline, className, children, ...props }: CodeProps) => {
    if (inline) {
      return (
        <code className="markdown-inline-code" {...props}>
          {children}
        </code>
      );
    }
    return (
      <CodeBlock className={className} {...props}>
        {children}
      </CodeBlock>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export function MarkdownRenderer({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
