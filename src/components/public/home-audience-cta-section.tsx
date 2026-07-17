import Link from "next/link";
import type { AudienceCtaBand } from "@/types/cms";
import { cn } from "@/lib/utils";

type CtaVariant = "lavender" | "gradient" | "ink";

function AudienceCtaCard({
  cta,
  href,
  variant,
}: {
  cta: AudienceCtaBand;
  href: string;
  variant: CtaVariant;
}) {
  const isGradient = variant === "gradient";
  const isInk = variant === "ink";

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col rounded-radius p-5 sm:p-6",
        variant === "lavender" && "border border-border bg-grad-dusk",
        isGradient && "bg-fill-accent text-on-accent",
        isInk && "border border-border bg-fill-primary text-on-primary",
      )}
    >
      {cta.eyebrow ? (
        <p
          className={cn(
            "mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
            isGradient || isInk ? "text-brand-lavender" : "text-text-label",
          )}
        >
          {cta.eyebrow}
        </p>
      ) : null}
      {cta.title ? (
        <h3
          className={cn(
            "font-serif text-xl sm:text-2xl",
            !isGradient && !isInk && "text-text-primary",
          )}
        >
          {cta.title}
        </h3>
      ) : null}
      {cta.body ? (
        <p
          className={cn(
            "mt-2 flex-1 text-sm leading-relaxed",
            isGradient || isInk ? "opacity-85" : "text-text-secondary",
          )}
        >
          {cta.body}
        </p>
      ) : null}
      {cta.ctaLabel ? (
        isGradient ? (
          <Link
            href={href}
            className="mt-5 inline-flex min-h-8 w-fit items-center rounded-radius-sm border border-on-gradient/50 bg-white/15 px-2.5 text-xs font-medium text-on-gradient hover:bg-white/25"
          >
            {cta.ctaLabel}
          </Link>
        ) : isInk ? (
          <Link
            href={href}
            className="mt-5 inline-flex min-h-8 w-fit items-center rounded-radius-sm border border-on-primary/40 bg-white/10 px-2.5 text-xs font-medium text-on-primary hover:bg-white/20"
          >
            {cta.ctaLabel}
          </Link>
        ) : (
          <Link href={href} className="btn-brand mt-5 w-fit">
            {cta.ctaLabel}
          </Link>
        )
      ) : null}
    </div>
  );
}

function hasCta(cta?: AudienceCtaBand) {
  return Boolean(cta?.title || cta?.ctaLabel);
}

export function HomeAudienceCtaSection({
  talentCta,
  companyCta,
  rolesCta,
}: {
  talentCta?: AudienceCtaBand;
  companyCta?: AudienceCtaBand;
  rolesCta?: AudienceCtaBand;
}) {
  const cards = [
    hasCta(talentCta)
      ? { key: "talent", cta: talentCta!, variant: "lavender" as const }
      : null,
    hasCta(companyCta)
      ? { key: "company", cta: companyCta!, variant: "gradient" as const }
      : null,
    hasCta(rolesCta)
      ? { key: "roles", cta: rolesCta!, variant: "ink" as const }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    cta: AudienceCtaBand;
    variant: CtaVariant;
  }>;

  if (!cards.length) return null;

  return (
    <section className="page-section">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ key, cta, variant }) => (
          <AudienceCtaCard
            key={key}
            cta={cta}
            variant={variant}
            href={cta.ctaHref?.trim() || "/"}
          />
        ))}
      </div>
    </section>
  );
}
