import Link from "next/link";
import { Button, SectionEyebrow } from "@/components/ui";
import { cn } from "@/lib/utils";

export type MoveOsLabels = {
  moveOsEyebrow?: string;
  moveOsHeadline?: string;
  moveOsSubtext?: string;
  moveOsDualCommitTitle?: string;
  moveOsDualCommitBody?: string;
  moveOsSprintTitle?: string;
  moveOsSprintBody?: string;
  moveOsArrivalTitle?: string;
  moveOsArrivalBody?: string;
  moveOsCtaLabel?: string;
  moveOsCtaHref?: string;
};

function Column({
  title,
  body,
}: {
  title?: string;
  body?: string;
}) {
  if (!title && !body) return null;
  return (
    <div className="space-y-2 rounded-radius border border-border bg-surface-1 p-4">
      {title ? (
        <h3 className="font-serif text-lg text-text-primary">{title}</h3>
      ) : null}
      {body ? (
        <p className="text-sm leading-relaxed text-text-secondary">{body}</p>
      ) : null}
    </div>
  );
}

export function HomeMoveOsSection({
  labels,
  className,
}: {
  labels: MoveOsLabels;
  /** Override default `page-section` wrapper (e.g. when nested in a page shell). */
  className?: string;
}) {
  if (!labels.moveOsHeadline?.trim() && !labels.moveOsEyebrow?.trim()) {
    return null;
  }

  const columns = [
    {
      key: "dual",
      title: labels.moveOsDualCommitTitle,
      body: labels.moveOsDualCommitBody,
    },
    {
      key: "sprint",
      title: labels.moveOsSprintTitle,
      body: labels.moveOsSprintBody,
    },
    {
      key: "arrival",
      title: labels.moveOsArrivalTitle,
      body: labels.moveOsArrivalBody,
    },
  ].filter((col) => col.title || col.body);

  return (
    <section className={cn("page-section space-y-5", className)}>
      <div className="max-w-2xl space-y-1.5">
        {labels.moveOsEyebrow ? (
          <SectionEyebrow>{labels.moveOsEyebrow}</SectionEyebrow>
        ) : null}
        {labels.moveOsHeadline ? (
          <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
            {labels.moveOsHeadline}
          </h2>
        ) : null}
        {labels.moveOsSubtext ? (
          <p className="text-sm text-text-secondary">{labels.moveOsSubtext}</p>
        ) : null}
      </div>

      {columns.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {columns.map((col) => (
            <Column key={col.key} title={col.title} body={col.body} />
          ))}
        </div>
      ) : null}

      {labels.moveOsCtaLabel && labels.moveOsCtaHref ? (
        <Link href={labels.moveOsCtaHref}>
          <Button variant="brand">{labels.moveOsCtaLabel}</Button>
        </Link>
      ) : null}
    </section>
  );
}
