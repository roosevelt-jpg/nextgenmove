import type { PageHomeDocument } from "@/types/cms";
import { FALLBACK_PAGE_HOME } from "@/lib/public/cms-fallbacks";

function preferArray<T>(overlay: T[] | undefined, base: T[] | undefined): T[] | undefined {
  if (overlay && overlay.length > 0) return overlay;
  return base;
}

/** Fill gaps from the operational homepage shell when Firestore is partial. */
export function mergePageHome(
  overlay: PageHomeDocument,
  base: PageHomeDocument = FALLBACK_PAGE_HOME,
): PageHomeDocument {
  return {
    ...base,
    ...overlay,
    boardingPass: { ...base.boardingPass, ...overlay.boardingPass },
    routesMarquee: { ...base.routesMarquee, ...overlay.routesMarquee },
    corridorChipsMarquee: {
      ...base.corridorChipsMarquee,
      ...overlay.corridorChipsMarquee,
    },
    talentCta: overlay.talentCta ?? base.talentCta,
    companyCta: overlay.companyCta ?? base.companyCta,
    rolesCta: overlay.rolesCta ?? base.rolesCta,
    steps: preferArray(overlay.steps, base.steps),
    statBlocks: preferArray(overlay.statBlocks, base.statBlocks),
    originCities: preferArray(overlay.originCities, base.originCities),
    corridorChips: preferArray(overlay.corridorChips, base.corridorChips),
    currentRoutesItems: preferArray(
      overlay.currentRoutesItems,
      base.currentRoutesItems,
    ),
    testimonialQuote: overlay.testimonialQuote || base.testimonialQuote,
    testimonialAttribution:
      overlay.testimonialAttribution || base.testimonialAttribution,
    testimonialBadge: overlay.testimonialBadge || base.testimonialBadge,
    storiesEyebrow: overlay.storiesEyebrow || base.storiesEyebrow,
    storiesHeadline: overlay.storiesHeadline || base.storiesHeadline,
    storiesManagedLabel:
      overlay.storiesManagedLabel || base.storiesManagedLabel,
    podcastEyebrow: overlay.podcastEyebrow || base.podcastEyebrow,
    podcastHeadline: overlay.podcastHeadline || base.podcastHeadline,
    podcastManagedLabel:
      overlay.podcastManagedLabel || base.podcastManagedLabel,
  };
}
