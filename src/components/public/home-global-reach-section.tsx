import type { PageHomeDocument } from "@/types/cms";
import { SectionEyebrow } from "@/components/ui";

function normalizeChips(
  chips: PageHomeDocument["corridorChips"],
): string[] {
  if (!chips?.length) return [];
  return chips
    .map((chip) => {
      if (typeof chip === "string") return chip.trim();
      if (chip && typeof chip === "object" && "chip" in chip) {
        return String((chip as { chip?: string }).chip ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

export function HomeGlobalReachSection({
  page,
}: {
  page: PageHomeDocument | null;
}) {
  if (
    !page?.globalReachEyebrow &&
    !page?.globalReachHeadline &&
    !page?.globalReachBody
  ) {
    return null;
  }

  const hub = (page.hubLabel ?? "").toUpperCase();
  const chips = normalizeChips(page.corridorChips).length
    ? normalizeChips(page.corridorChips)
    : (page.originCities ?? [])
        .map((city) => city.code)
        .filter(Boolean)
        .map((code) =>
          hub ? `${code.toUpperCase()} → ${hub}` : code.toUpperCase(),
        );

  return (
    <section className="page-container py-6">
      <div className="relative overflow-hidden rounded-radius bg-grad-rouse px-6 py-8 text-on-gradient sm:px-8 sm:py-10">
        <div className="relative z-[1] max-w-3xl space-y-3">
          {page.globalReachEyebrow ? (
            <SectionEyebrow className="text-brand-lavender">
              {page.globalReachEyebrow}
            </SectionEyebrow>
          ) : null}
          {page.globalReachHeadline ? (
            <h2 className="font-serif text-2xl font-medium md:text-3xl">
              {page.globalReachHeadline}
            </h2>
          ) : null}
          {page.globalReachBody ? (
            <p className="text-sm leading-relaxed text-brand-lavender">
              {page.globalReachBody}
            </p>
          ) : null}
          {chips.length ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-on-gradient/25 bg-white/10 px-3 py-1.5 font-mono text-[11px] tracking-wide text-brand-amber-1"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
