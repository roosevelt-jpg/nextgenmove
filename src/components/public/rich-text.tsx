import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { looksLikeHtml, stripHtmlToPlainText } from "@/lib/content/plain-text";

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  /** Plain text preferred. Legacy HTML is stripped to plain text. */
  html?: string;
  /** Alias for plain body copy. */
  text?: string;
}

/**
 * Renders CMS body copy as plain text only (no HTML).
 * Newlines become paragraphs; any leftover markup is stripped.
 */
export function RichText({ html, text, className, ...props }: RichTextProps) {
  const raw = text ?? html ?? "";
  const plain = looksLikeHtml(raw) ? stripHtmlToPlainText(raw) : raw.trim();
  if (!plain) {
    return null;
  }

  const paragraphs = plain.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div
      className={cn("max-w-none space-y-3 text-text-secondary", className)}
      {...props}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
