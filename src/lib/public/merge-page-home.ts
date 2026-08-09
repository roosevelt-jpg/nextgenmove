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
    storiesCardBadge: overlay.storiesCardBadge || base.storiesCardBadge,
    storiesDemoBadge: overlay.storiesDemoBadge || base.storiesDemoBadge,
    podcastEyebrow: overlay.podcastEyebrow || base.podcastEyebrow,
    podcastHeadline: overlay.podcastHeadline || base.podcastHeadline,
    podcastManagedLabel:
      overlay.podcastManagedLabel || base.podcastManagedLabel,
    testimonialsEyebrow:
      overlay.testimonialsEyebrow || base.testimonialsEyebrow,
    testimonialsHeadline:
      overlay.testimonialsHeadline || base.testimonialsHeadline,
    testimonialsSubtext:
      overlay.testimonialsSubtext || base.testimonialsSubtext,
    testimonialsManagedLabel:
      overlay.testimonialsManagedLabel || base.testimonialsManagedLabel,
    testimonialsSubmitCta:
      overlay.testimonialsSubmitCta || base.testimonialsSubmitCta,
    testimonialsSignInPrompt:
      overlay.testimonialsSignInPrompt || base.testimonialsSignInPrompt,
    testimonialsSignInCta:
      overlay.testimonialsSignInCta || base.testimonialsSignInCta,
    testimonialsEmptyText:
      overlay.testimonialsEmptyText || base.testimonialsEmptyText,
    testimonialsPendingThanks:
      overlay.testimonialsPendingThanks || base.testimonialsPendingThanks,
    testimonialsQuoteLabel:
      overlay.testimonialsQuoteLabel || base.testimonialsQuoteLabel,
    testimonialsRatingLabel:
      overlay.testimonialsRatingLabel || base.testimonialsRatingLabel,
    testimonialsPhotoLabel:
      overlay.testimonialsPhotoLabel || base.testimonialsPhotoLabel,
    testimonialsNameLabel:
      overlay.testimonialsNameLabel || base.testimonialsNameLabel,
    testimonialsVerifiedLabel:
      overlay.testimonialsVerifiedLabel || base.testimonialsVerifiedLabel,
    testimonialsSlider: {
      ...base.testimonialsSlider,
      ...overlay.testimonialsSlider,
    },
    corridorIntelEyebrow:
      overlay.corridorIntelEyebrow || base.corridorIntelEyebrow,
    corridorIntelHeadline:
      overlay.corridorIntelHeadline || base.corridorIntelHeadline,
    corridorIntelSubtext:
      overlay.corridorIntelSubtext || base.corridorIntelSubtext,
    corridorIntelSkillsLabel:
      overlay.corridorIntelSkillsLabel || base.corridorIntelSkillsLabel,
    corridorIntelCitiesLabel:
      overlay.corridorIntelCitiesLabel || base.corridorIntelCitiesLabel,
    corridorIntelNationalitiesLabel:
      overlay.corridorIntelNationalitiesLabel ||
      base.corridorIntelNationalitiesLabel,
    corridorIntelEmptyText:
      overlay.corridorIntelEmptyText || base.corridorIntelEmptyText,
    talentStoriesEyebrow:
      overlay.talentStoriesEyebrow || base.talentStoriesEyebrow,
    talentStoriesHeadline:
      overlay.talentStoriesHeadline || base.talentStoriesHeadline,
    talentStoriesSubtext:
      overlay.talentStoriesSubtext || base.talentStoriesSubtext,
    talentStoriesManagedLabel:
      overlay.talentStoriesManagedLabel || base.talentStoriesManagedLabel,
    talentStoriesEmptyText:
      overlay.talentStoriesEmptyText || base.talentStoriesEmptyText,
    talentStoriesViewAllLabel:
      overlay.talentStoriesViewAllLabel || base.talentStoriesViewAllLabel,
    talentStoriesViewAllHref:
      overlay.talentStoriesViewAllHref || base.talentStoriesViewAllHref,
    talentStoriesFilterAllLabel:
      overlay.talentStoriesFilterAllLabel || base.talentStoriesFilterAllLabel,
    talentStoriesCorridorCtaLabel:
      overlay.talentStoriesCorridorCtaLabel ||
      base.talentStoriesCorridorCtaLabel,
    talentStoriesCorridorCtaHref:
      overlay.talentStoriesCorridorCtaHref ||
      base.talentStoriesCorridorCtaHref,
    talentStoriesEmptyFilteredText:
      overlay.talentStoriesEmptyFilteredText ||
      base.talentStoriesEmptyFilteredText,
    benchTeaserEyebrow:
      overlay.benchTeaserEyebrow || base.benchTeaserEyebrow,
    benchTeaserHeadline:
      overlay.benchTeaserHeadline || base.benchTeaserHeadline,
    benchTeaserSubtext:
      overlay.benchTeaserSubtext || base.benchTeaserSubtext,
    benchTeaserCtaLabel:
      overlay.benchTeaserCtaLabel || base.benchTeaserCtaLabel,
    benchTeaserCtaHref:
      overlay.benchTeaserCtaHref || base.benchTeaserCtaHref,
    benchTeaserEmptyText:
      overlay.benchTeaserEmptyText || base.benchTeaserEmptyText,
    benchTeaserReadyLabel:
      overlay.benchTeaserReadyLabel || base.benchTeaserReadyLabel,
    benchTeaserCorridorsLabel:
      overlay.benchTeaserCorridorsLabel || base.benchTeaserCorridorsLabel,
    moveOsEyebrow: overlay.moveOsEyebrow || base.moveOsEyebrow,
    moveOsHeadline: overlay.moveOsHeadline || base.moveOsHeadline,
    moveOsSubtext: overlay.moveOsSubtext || base.moveOsSubtext,
    moveOsDualCommitTitle:
      overlay.moveOsDualCommitTitle || base.moveOsDualCommitTitle,
    moveOsDualCommitBody:
      overlay.moveOsDualCommitBody || base.moveOsDualCommitBody,
    moveOsSprintTitle: overlay.moveOsSprintTitle || base.moveOsSprintTitle,
    moveOsSprintBody: overlay.moveOsSprintBody || base.moveOsSprintBody,
    moveOsArrivalTitle: overlay.moveOsArrivalTitle || base.moveOsArrivalTitle,
    moveOsArrivalBody: overlay.moveOsArrivalBody || base.moveOsArrivalBody,
    moveOsCtaLabel: overlay.moveOsCtaLabel || base.moveOsCtaLabel,
    moveOsCtaHref: overlay.moveOsCtaHref || base.moveOsCtaHref,
    newsletterEyebrow: overlay.newsletterEyebrow || base.newsletterEyebrow,
    newsletterHeadline: overlay.newsletterHeadline || base.newsletterHeadline,
    newsletterSubtext: overlay.newsletterSubtext || base.newsletterSubtext,
    newsletterCorridorLabel:
      overlay.newsletterCorridorLabel || base.newsletterCorridorLabel,
    newsletterSuccessMessage:
      overlay.newsletterSuccessMessage || base.newsletterSuccessMessage,
  };
}
