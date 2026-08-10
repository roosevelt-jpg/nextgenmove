import type {
  PageHomeDocument,
  PageMarketplaceDocument,
  PagePricingDocument,
  PageTracksDocument,
  PageVisaPathDocument,
  SiteSettingsDocument,
} from "@/types/cms";

/**
 * Last-resort public CMS shells used only when Firestore is unreachable.
 * Mirrors operational seed content so the marketing site stays readable
 * during quota / outage windows instead of rendering a blank page.
 */
export const FALLBACK_SITE_SETTINGS: SiteSettingsDocument = {
  siteName: "Nextgenmove",
  tagline: "Your next step, engineered.",
  siteDescription: "Your next step, engineered.",
  brandMark: "N",
  contactEmail: "info@nextgenmove.agency",
  contactPhone: "",
  contactAddress: "",
  youtubePlaylistUrl: "",
  youtubeSyncEnabled: true,
  youtubeHomepageLimit: 12,
  youtubeLibraryLimit: 50,
  navLabels: {
    siteName: "Nextgenmove",
    companySection: "Company",
    talentSection: "Talent",
    employersSection: "Employers",
    about: "About",
    careers: "Careers",
    journal: "Journal",
    browseRoles: "Browse roles",
    howItWorks: "How it works",
    visaPath: "Visa path",
    marketplace: "Marketplace",
    stories: "Stories",
    credits: "Credits",
    pricing: "Pricing",
    tracks: "Tracks",
    requestTalent: "Request talent",
    forCompanies: "For companies",
    signIn: "Log in",
    headerCta: "Start your journey",
    headerCtaHref: "/sign-up",
    contact: "Contact",
  },
  pageLabels: {
    roleReadinessEyebrow: "Role readiness",
    roleReadinessMatchLabel: "Evidence match {present}/{required}",
    roleReadinessAnonTeaser:
      "Sign up to see how your evidence vault lines up with this role.",
    roleReadinessSignUpCta: "Create free account",
    roleReadinessSignUpHref: "/sign-up",
  },
  formLabels: {
    assistantLeadHiringTitle: "Talk to us about hiring",
    assistantLeadHiringBody:
      "Share a work email and we will route you to the right employer contact.",
    assistantLeadTalentTitle: "Talk to us about your move",
    assistantLeadTalentBody:
      "Leave your details and a coach will follow up on next steps.",
    assistantLeadHiringCta: "Request hiring help",
    assistantLeadTalentCta: "Request talent help",
    assistantLeadNameLabel: "Name",
    assistantLeadEmailLabel: "Email",
    assistantLeadSubmit: "Send",
    assistantLeadSuccess: "Thanks — we will be in touch shortly.",
    assistantLeadError: "Could not send. Please try again.",
  },
  conversionLabels: {
    roleReadinessEyebrow: "Role readiness",
    roleReadinessMatchLabel: "Evidence match {present}/{required}",
    roleReadinessAnonTeaser:
      "Sign up to see how your evidence vault lines up with this role.",
    roleReadinessSignUpCta: "Create free account",
    roleReadinessSignUpHref: "/sign-up",
    assistantLeadHiringTitle: "Talk to us about hiring",
    assistantLeadHiringBody:
      "Share a work email and we will route you to the right employer contact.",
    assistantLeadTalentTitle: "Talk to us about your move",
    assistantLeadTalentBody:
      "Leave your details and a coach will follow up on next steps.",
    assistantLeadHiringCta: "Request hiring help",
    assistantLeadTalentCta: "Request talent help",
    assistantLeadNameLabel: "Name",
    assistantLeadEmailLabel: "Email",
    assistantLeadSubmit: "Send",
    assistantLeadSuccess: "Thanks — we will be in touch shortly.",
    assistantLeadError: "Could not send. Please try again.",
  },
  adminNavLabels: {
    dashboard: "Dashboard",
    levers: "Program Levers",
    crm: "CRM",
    contact: "Contact",
    library: "Content Library",
    content: "Homepage Content",
    settings: "Settings",
    account: "My account",
    integrations: "Integrations",
    users: "Users",
  },
  studentNavLabels: {
    dashboard: "Dashboard",
    wallet: "Wallet",
    store: "Content store",
    evidence: "Evidence vault",
    visaPath: "Visa path",
    move: "My move",
    profile: "Profile",
    settings: "Settings",
  },
  employerNavLabels: {
    dashboard: "Dashboard",
    talentPool: "Talent pool",
    pipeline: "Pipeline",
    shortlist: "Shortlist",
    profile: "Profile",
    settings: "Settings",
  },
};

/** Shared Move OS explainer copy used across home / tracks / pricing fallbacks. */
const FALLBACK_MOVE_OS = {
  moveOsEyebrow: "Move OS",
  moveOsHeadline: "Dual commitment. Shadow sprint. Arrival.",
  moveOsSubtext:
    "A structured path from mutual commit through a short proof sprint to day-one readiness — without inventing placements.",
  moveOsDualCommitTitle: "Dual commit",
  moveOsDualCommitBody:
    "Talent and employer both confirm intent before the sprint starts, so time and evidence are spent on real fits.",
  moveOsSprintTitle: "Shadow sprint",
  moveOsSprintBody:
    "A short, scoped work sample against the role — scored on evidence, not interviews alone.",
  moveOsArrivalTitle: "Arrival",
  moveOsArrivalBody:
    "When the sprint clears, relocation and onboarding steps stay on one shared timeline.",
  moveOsCtaLabel: "See how Move OS works",
  moveOsCtaHref: "/how-it-works",
} as const;

export const FALLBACK_PAGE_HOME: PageHomeDocument = {
  eyebrowText: "Relocation. Engineered.",
  headline: "Your next step,",
  headlineEmphasis: "engineered.",
  subtext:
    "Nextgenmove pairs you with a personal coach, a vetted employer, and a visa-ready path abroad — from first application to first day.",
  ctaPrimaryLabel: "Explore open roles",
  ctaPrimaryHref: "/careers-talent",
  ctaSecondaryLabel: "I'm hiring",
  ctaSecondaryHref: "/request-talent",
  hubLabel: "DXB",
  hubCaption: "Internship hub",
  globeStoryEyebrow: "Live routes",
  globeStoryTitle: "Students take off. Internships connect.",
  globeStoryBody:
    "From home cities to your hub — coaches, visas, and employers on one route.",
  globeStoryChipStudent: "Student",
  globeStoryChipFlight: "Flight",
  globeStoryChipInternship: "Internship",
  currentRoutesLabel: "Current routes",
  currentRoutesItems: [
    { code: "AMS" },
    { code: "BER" },
    { code: "CAI" },
    { code: "WAW" },
    { code: "PAR" },
    { code: "LIS" },
    { code: "DXB" },
  ],
  routesMarquee: {
    enabled: true,
    speedSec: 28,
    direction: "ltr",
    easing: "linear",
    pauseOnHover: true,
    separator: " · ",
  },
  globalReachEyebrow: "Global reach",
  globalReachHeadline: "Six corridors. One arrival city.",
  globalReachBody:
    "Every route on this map is live — a coach on one end, a vetted employer on the other, and a candidate somewhere mid-flight.",
  corridorChips: [
    { chip: "AMS → DXB" },
    { chip: "BER → DXB" },
    { chip: "CAI → DXB" },
    { chip: "WAW → DXB" },
    { chip: "PAR → DXB" },
    { chip: "LIS → DXB" },
  ],
  corridorChipsMarquee: {
    enabled: true,
    speedSec: 24,
    direction: "ltr",
    easing: "linear",
    pauseOnHover: true,
  },
  originCities: [
    {
      code: "AMS",
      label: "Amsterdam",
      initials: "AM",
      x: 80,
      y: 140,
      avatarX: 80,
      avatarY: 105,
    },
    {
      code: "BER",
      label: "Berlin",
      initials: "BE",
      x: 70,
      y: 250,
      avatarX: 55,
      avatarY: 250,
    },
    {
      code: "CAI",
      label: "Cairo",
      initials: "CA",
      x: 90,
      y: 360,
      avatarX: 78,
      avatarY: 398,
    },
    {
      code: "WAW",
      label: "Warsaw",
      initials: "WA",
      x: 420,
      y: 120,
      avatarX: 430,
      avatarY: 85,
    },
    {
      code: "PAR",
      label: "Paris",
      initials: "PA",
      x: 440,
      y: 260,
      avatarX: 465,
      avatarY: 260,
    },
    {
      code: "LIS",
      label: "Lisbon",
      initials: "LI",
      x: 410,
      y: 380,
      avatarX: 425,
      avatarY: 405,
    },
  ],
  boardingPass: {
    routeLabel: "AMS → DXB",
    passengerLabel: "Passenger",
    passengerValue: "You",
    coachLabel: "Coach",
    coachValue: "Assigned coach",
    statusLabel: "Status",
    statusValue: "Boarding",
    classLabel: "Class",
    classValue: "Track B",
    refLabel: "Ref",
    refValue: "NEXTGENMOVE",
  },
  itineraryEyebrow: "The itinerary",
  itineraryHeadline: "Four steps. One arrival.",
  storiesEyebrow: "Stories",
  storiesHeadline: "Hear it from them.",
  storiesManagedLabel: "Managed in admin · Homepage content",
  storiesCardBadge: "Candidate story",
  storiesDemoBadge: "Sample",
  podcastEyebrow: "The Move Podcast",
  podcastHeadline: "Conversations from the route.",
  podcastManagedLabel: "Managed in admin · Homepage content",
  testimonialQuote:
    "Six weeks ago I was refreshing job boards in Amsterdam. Today I'm running brand for a scale-up in Dubai — and my coach was in my corner for every leg of it.",
  testimonialAttribution: "Sara K. · Marketing lead · Placed via Nextgenmove",
  testimonialBadge: "Placed {year}",
  testimonialsEyebrow: "Testimonials",
  testimonialsHeadline: "Voices from the route.",
  testimonialsSubtext:
    "Students and employers share what the move felt like — published after review.",
  testimonialsManagedLabel: "Managed in admin · Homepage content",
  testimonialsSubmitCta: "Submit testimonial",
  testimonialsSignInPrompt:
    "Sign in as a student or employer to share your experience.",
  testimonialsSignInCta: "Sign in to post",
  testimonialsEmptyText:
    "Be the first voice on this board — sign in and submit a testimonial for review.",
  testimonialsPendingThanks:
    "Thanks — your testimonial is pending review.",
  testimonialsQuoteLabel: "Your testimonial",
  testimonialsRatingLabel: "Rating",
  testimonialsPhotoLabel: "Photo (optional)",
  testimonialsNameLabel: "Your name",
  testimonialsVerifiedLabel: "Verified placement",
  testimonialsSlider: {
    enabled: true,
    speedSec: 48,
    pauseOnHover: true,
    direction: "ltr",
  },
  corridorIntelEyebrow: "Corridor intelligence",
  corridorIntelHeadline: "What the live pool looks like.",
  corridorIntelSubtext:
    "Aggregate signals only — skills from open roles, cities and nationalities from talent profiles. No names or emails.",
  corridorIntelSkillsLabel: "Top skills",
  corridorIntelCitiesLabel: "Top cities",
  corridorIntelNationalitiesLabel: "Nationalities",
  corridorIntelEmptyText:
    "Live corridor aggregates will appear as the pool grows.",
  talentStoriesEyebrow: "Talent stories",
  talentStoriesHeadline: "Placed voices, in their words.",
  talentStoriesSubtext:
    "Opt-in stories from talent who completed a placement. Published after review.",
  talentStoriesManagedLabel: "Managed in admin · Talent stories",
  talentStoriesEmptyText: "Published talent stories will appear here.",
  talentStoriesViewAllLabel: "View all stories →",
  talentStoriesViewAllHref: "/stories",
  talentStoriesFilterAllLabel: "All corridors",
  talentStoriesCorridorCtaLabel: "Explore this corridor",
  talentStoriesCorridorCtaHref: "/visa-path",
  talentStoriesEmptyFilteredText:
    "No published stories for this corridor yet. Try another filter or check back soon.",
  benchTeaserEyebrow: "Employer bench",
  benchTeaserHeadline: "Ready talent, by corridor.",
  benchTeaserSubtext:
    "A live slice of candidates marked ready for introduction — counts only, no profiles until you request access.",
  benchTeaserCtaLabel: "Request talent",
  benchTeaserCtaHref: "/request-talent",
  benchTeaserEmptyText: "Bench counts will appear as talent becomes ready.",
  benchTeaserReadyLabel: "Ready now",
  benchTeaserCorridorsLabel: "Corridors",
  ...FALLBACK_MOVE_OS,
  newsletterEyebrow: "Dispatch",
  newsletterHeadline: "One email a month. No noise.",
  newsletterSubtext:
    "Corridor updates, open roles, and Move OS tips — unsubscribe anytime.",
  newsletterCorridorLabel: "Preferred corridor (optional)",
  newsletterSuccessMessage: "You're on the list. Watch for the next dispatch.",
  talentCta: {
    eyebrow: "For talent",
    title: "Your seat is waiting.",
    body: "Free to join. Earn your first credits on welcome.",
    ctaLabel: "Get started",
    ctaHref: "/sign-up",
  },
  companyCta: {
    eyebrow: "For companies",
    title: "A pool, pre-flown.",
    body: "Every candidate is pre-screened and coached before you see them.",
    ctaLabel: "View plans",
    ctaHref: "/pricing",
  },
  rolesCta: {
    eyebrow: "Open seats",
    title: "Roles, ready now.",
    body: "Browse live openings across corridors — visa-ready paths included.",
    ctaLabel: "Browse roles",
    ctaHref: "/careers-talent",
  },
  steps: [
    {
      legNumber: 1,
      phaseLabel: "STEP 01",
      title: "Connect and build your profile",
      description:
        "Click the connect button to create your account and build your profile.",
    },
    {
      legNumber: 2,
      phaseLabel: "STEP 02",
      title: "Get background checked",
      description:
        "Complete verification so employers can trust your credentials.",
    },
    {
      legNumber: 3,
      phaseLabel: "STEP 03",
      title: "Publish your profile for employers",
      description:
        "Go live in the talent pool so vetted employers can find you.",
    },
    {
      legNumber: 4,
      phaseLabel: "STEP 04",
      title: "Follow up and start work",
      description:
        "Follow up with messages and start work immediately once placed.",
    },
  ],
  statBlocks: [
    {
      label: "Active students",
      value: "0",
      metric: "active_students",
      suffix: "+",
    },
    {
      label: "Partner employers",
      value: "0",
      metric: "active_companies",
      suffix: "+",
    },
    {
      label: "Avg. time to place",
      value: "—",
      metric: "avg_time_to_place",
    },
    {
      label: "Placed this year",
      value: "0",
      metric: "placed_this_year",
      suffix: "+",
    },
  ],
};

export const FALLBACK_PAGE_VISA_PATH: PageVisaPathDocument = {
  eyebrow: "Visa path",
  headline: "Simulate your corridor timeline.",
  subtext:
    "Pick a corridor to see milestone timing and the evidence kinds employers expect before boarding.",
  selectCorridorLabel: "Choose a corridor",
  timelineLabel: "Timeline",
  evidenceLabel: "Required evidence",
  missingEvidenceLabel: "Missing from your vault",
  presentEvidenceLabel: "In your vault",
  signInPrompt: "Sign in as a student to compare against your evidence vault.",
  signInCta: "Sign in",
  totalDaysLabel: "{days} days total",
  emptyCorridorsText: "Visa corridors will appear here soon.",
  anonymousUploadCta: "Create an account to upload evidence",
  anonymousUploadHref: "/sign-up",
  vaultOpenCta: "Open evidence vault",
  vaultOpenHref: "/student/evidence",
  missingKindCtaTemplate: "Add {kind} to your vault",
  corridors: [
    {
      id: "eu_dxb",
      label: "EU → Dubai",
      steps: [
        {
          title: "Passport & eligibility pack",
          days: 7,
          evidenceKinds: ["passport", "visa_eligibility_pack"],
        },
        {
          title: "Funds & English proof",
          days: 14,
          evidenceKinds: ["funds_proof", "english_proof"],
        },
        {
          title: "CV & attested portfolio",
          days: 10,
          evidenceKinds: ["cv", "attested_portfolio"],
        },
        {
          title: "Housing readiness",
          days: 21,
          evidenceKinds: ["housing_readiness"],
        },
      ],
    },
  ],
};

export const FALLBACK_PAGE_MARKETPLACE: PageMarketplaceDocument = {
  eyebrow: "Marketplace",
  title: "Hire and apply with mutual privacy.",
  subtitle:
    "Talent and employers meet with identities masked until both sides are ready to reveal.",
  body:
    "Browse anonymized roles, apply in one click, then request an employer reveal after you apply. Employers see masked talent profiles until Nextgenmove unlocks identity.",
  privacyTitle: "Mutual privacy by default",
  privacyBody:
    "Company names stay anonymized for talent until an unlock is approved. Candidate identity stays masked for employers until unlock — via Nextgenmove review or credits when enabled.",
  searchPlaceholder: "Search by title, skill, or location",
  filterLocation: "Location",
  filterType: "Employment type",
  filterSkill: "Skill",
  applyCta: "Apply",
  revealEmployerCta: "Reveal employer",
  revealEmployerPending: "Reveal pending",
  revealEmployerDone: "Employer revealed",
  maskedEmployerHint: "Employer identity is hidden until you request a reveal.",
  unlockTalentCta: "Request unlock",
  unlockWithCreditsCta: "Unlock with credits",
  empty: "No open roles match your filters.",
  loadError: "Could not load marketplace roles. Try again.",
  loading: "Loading marketplace…",
  talentSignUpCta: "Join as talent",
  talentSignUpHref: "/sign-up",
  employerRequestCta: "Request talent",
  employerRequestHref: "/request-talent",
  browseRolesCta: "Browse public roles",
  browseRolesHref: "/careers-talent",
};

/** Flat portal labels derived from the marketplace singleton fallback. */
export const FALLBACK_MARKETPLACE_LABELS: Record<string, string> = {
  eyebrow: FALLBACK_PAGE_MARKETPLACE.eyebrow!,
  title: FALLBACK_PAGE_MARKETPLACE.title!,
  subtitle: FALLBACK_PAGE_MARKETPLACE.subtitle!,
  searchPlaceholder: FALLBACK_PAGE_MARKETPLACE.searchPlaceholder!,
  filterLocation: FALLBACK_PAGE_MARKETPLACE.filterLocation!,
  filterType: FALLBACK_PAGE_MARKETPLACE.filterType!,
  filterSkill: FALLBACK_PAGE_MARKETPLACE.filterSkill!,
  applyCta: FALLBACK_PAGE_MARKETPLACE.applyCta!,
  revealEmployerCta: FALLBACK_PAGE_MARKETPLACE.revealEmployerCta!,
  revealEmployerPending: FALLBACK_PAGE_MARKETPLACE.revealEmployerPending!,
  revealEmployerDone: FALLBACK_PAGE_MARKETPLACE.revealEmployerDone!,
  maskedEmployerHint: FALLBACK_PAGE_MARKETPLACE.maskedEmployerHint!,
  unlockTalentCta: FALLBACK_PAGE_MARKETPLACE.unlockTalentCta!,
  unlockWithCreditsCta: FALLBACK_PAGE_MARKETPLACE.unlockWithCreditsCta!,
  empty: FALLBACK_PAGE_MARKETPLACE.empty!,
  loadError: FALLBACK_PAGE_MARKETPLACE.loadError!,
  loading: FALLBACK_PAGE_MARKETPLACE.loading!,
};

export const FALLBACK_PAGE_PRICING: PagePricingDocument = {
  trackAHeadline: "Self service",
  trackAFeatures: [
    "Full talent pool access",
    "Pipeline tracking",
    "Introduction via Nextgenmove",
  ],
  trackBHeadline: "Nextgenmove does everything",
  trackBFeatures: [
    "Nextgenmove searches for you",
    "Weekly updates",
    "Full placement support",
  ],
  faqItems: [
    {
      question: "Can we switch tracks later?",
      answer:
        "Yes — plan changes go through a quick approval from your account contact.",
    },
    {
      question: "Is there a contract?",
      answer: "No lock-in on either track. Cancel anytime from Our Profile.",
    },
  ],
  ctaLabel: "Request this plan",
  ...FALLBACK_MOVE_OS,
};

export const FALLBACK_PAGE_TRACKS: PageTracksDocument = {
  trackABody:
    "<p>Browse the talent pool yourself. You find the match. Nextgenmove handles the introduction.</p>",
  trackBBody:
    "<p>Full service. Nextgenmove actively sources your match and coaches the placement through to day ninety.</p>",
  comparisonRows: [
    {
      feature: "Talent pool access",
      trackAValue: "Full",
      trackBValue: "Full",
    },
    {
      feature: "Sourcing",
      trackAValue: "Self-serve",
      trackBValue: "Nextgenmove-led",
    },
    {
      feature: "Coaching support",
      trackAValue: "Introductions",
      trackBValue: "End-to-end",
    },
  ],
  caseStudyQuote: null,
  ctaLabel: "Request talent",
  ctaHref: "/request-talent",
  ...FALLBACK_MOVE_OS,
};
