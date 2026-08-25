"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export function CodeBlock({
  code,
  label,
  language = "bash",
  className,
}: {
  code: string;
  label?: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — the text is selectable either way */
    }
  };

  return (
    <figure className={cn("overflow-hidden rounded-lg border border-line bg-surface-inset", className)}>
      <figcaption className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-1.5">
        <span className="font-mono text-[11px] text-ink-4">{label ?? language}</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          {copied ? <Check size={12} className="text-good" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre className="overflow-x-auto p-3.5 text-[11.5px] leading-relaxed">
        <code className="font-mono text-ink-2">{code}</code>
      </pre>
    </figure>
  );
}

export function FilePath({ children }: { children: string }) {
  return (
    <code className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] text-brand-ink">
      {children}
    </code>
  );
}
