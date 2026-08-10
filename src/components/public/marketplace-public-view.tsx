import Link from "next/link";
import { SectionEyebrow } from "@/components/ui";
import { getPageMarketplace } from "@/lib/collections/pages";
import type { PageMarketplaceDocument } from "@/types/cms";

function ctaClassName(variant: "primary" | "secondary" | "outline") {
  if (variant === "primary") {
    return "inline-flex min-h-10 items-center justify-center rounded-radius-sm bg-fill-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90";
  }
  if (variant === "secondary") {
    return "inline-flex min-h-10 items-center justify-center rounded-radius-sm bg-fill-accent px-4 text-sm font-semibold text-on-accent hover:opacity-90";
  }
  return "inline-flex min-h-10 items-center justify-center rounded-radius-sm border border-border px-4 text-sm font-semibold text-text-primary hover:bg-surface-2";
}

export function MarketplacePublicView({ page }: { page: PageMarketplaceDocument }) {
  return (
    <div className="page-section space-y-10">
      <section className="max-w-3xl space-y-3">
        {page.eyebrow ? <SectionEyebrow>{page.eyebrow}</SectionEyebrow> : null}
        {page.title ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {page.title}
          </h1>
        ) : null}
        {page.subtitle ? (
          <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
            {page.subtitle}
          </p>
        ) : null}
      </section>

      {page.body ? (
        <section className="max-w-3xl">
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
            {page.body}
          </p>
        </section>
      ) : null}

      {(page.privacyTitle || page.privacyBody) && (
        <section className="max-w-3xl space-y-2 rounded-radius border border-border bg-grad-card p-4">
          {page.privacyTitle ? (
            <h2 className="font-serif text-xl text-text-primary">
              {page.privacyTitle}
            </h2>
          ) : null}
          {page.privacyBody ? (
            <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
              {page.privacyBody}
            </p>
          ) : null}
        </section>
      )}

      <section className="flex flex-wrap gap-3">
        {page.talentSignUpCta && page.talentSignUpHref ? (
          <Link
            href={page.talentSignUpHref}
            className={ctaClassName("primary")}
          >
            {page.talentSignUpCta}
          </Link>
        ) : null}
        {page.employerRequestCta && page.employerRequestHref ? (
          <Link
            href={page.employerRequestHref}
            className={ctaClassName("secondary")}
          >
            {page.employerRequestCta}
          </Link>
        ) : null}
        {page.browseRolesCta && page.browseRolesHref ? (
          <Link
            href={page.browseRolesHref}
            className={ctaClassName("outline")}
          >
            {page.browseRolesCta}
          </Link>
        ) : null}
      </section>
    </div>
  );
}
