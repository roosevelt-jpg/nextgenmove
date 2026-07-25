import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { looksLikeHtml, stripHtmlToPlainText } from "@/lib/content/plain-text";

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  html?: string;
  text?: string;
  /** When true, allow a safe subset of HTML (bold/italic/lists/headings). */
  allowSafeHtml?: boolean;
}

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "UL",
  "OL",
  "LI",
  "H2",
  "H3",
  "H4",
  "A",
]);

function sanitizeHtml(raw: string): string {
  if (typeof window === "undefined") {
    // Server: strip scripts/styles/events with a conservative regex pass.
    return raw
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "");
  }

  const template = document.createElement("template");
  template.innerHTML = raw;
  const walk = (node: Node) => {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          el.replaceWith(...el.childNodes);
          continue;
        }
        for (const attr of [...el.attributes]) {
          if (attr.name.startsWith("on") || attr.name === "style") {
            el.removeAttribute(attr.name);
          }
          if (el.tagName === "A" && attr.name === "href") {
            const href = attr.value.trim();
            if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
              el.removeAttribute("href");
            } else {
              el.setAttribute("rel", "noopener noreferrer");
              el.setAttribute("target", "_blank");
            }
          } else if (el.tagName === "A" && attr.name !== "href" && attr.name !== "rel" && attr.name !== "target") {
            el.removeAttribute(attr.name);
          } else if (el.tagName !== "A") {
            el.removeAttribute(attr.name);
          }
        }
        walk(el);
      }
    }
  };
  walk(template.content);
  return template.innerHTML;
}

/**
 * Renders CMS body copy. With allowSafeHtml, preserves bold/italic/lists from TipTap.
 */
export function RichText({
  html,
  text,
  className,
  allowSafeHtml = false,
  ...props
}: RichTextProps) {
  const raw = text ?? html ?? "";
  if (!raw.trim()) return null;

  if (allowSafeHtml && looksLikeHtml(raw)) {
    const safe = sanitizeHtml(raw);
    return (
      <div
        className={cn(
          "max-w-none space-y-3 text-text-secondary [&_a]:underline [&_em]:italic [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-text-primary [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: safe }}
        {...props}
      />
    );
  }

  const plain = looksLikeHtml(raw) ? stripHtmlToPlainText(raw) : raw.trim();
  if (!plain) return null;
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
