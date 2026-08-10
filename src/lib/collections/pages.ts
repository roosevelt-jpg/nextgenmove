import { cache } from "react";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp, serializeForClient } from "@/lib/firestore-utils";
import type {
  ArticleDocument,
  ContentItemDocument,
  JobPostingDocument,
  PageAboutDocument,
  PageHomeDocument,
  PageHowItWorksDocument,
  PageMarketplaceDocument,
  PagePricingDocument,
  PageTracksDocument,
  PageVisaPathDocument,
  ProgramLeversDocument,
  PublicRoleDocument,
  PodcastEpisodeDocument,
  VideoCardDocument,
} from "@/types/cms";
import { cachedPublicCms } from "@/lib/public/cms-cache";
import {
  FALLBACK_PAGE_HOME,
  FALLBACK_PAGE_MARKETPLACE,
  FALLBACK_PAGE_PRICING,
  FALLBACK_PAGE_TRACKS,
} from "@/lib/public/cms-fallbacks";
import { mergePageHome } from "@/lib/public/merge-page-home";
import { listLiveVideoCards } from "@/lib/media/video-cards";
import { getSiteSettings } from "@/lib/collections/site-settings";
import {
  resolveStorageFileRef,
  resolveStorageUrl,
} from "@/lib/storage/file-ref";

async function loadPageHome(): Promise<PageHomeDocument> {
  const snapshot = await adminDb.collection("page_home").doc("default").get();
  const data = snapshot.data() as PageHomeDocument | undefined;
  if (!data) {
    throw new Error("page_home_missing");
  }

  // Admin repeatable fields may store { chip: "…" } — always expose strings to UI.
  const corridorChips = Array.isArray(data.corridorChips)
    ? data.corridorChips
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object" && "chip" in item) {
            return String(item.chip ?? "").trim();
          }
          return "";
        })
        .filter(Boolean)
    : undefined;

  return serializeForClient(
    mergePageHome({
      ...data,
      ...(corridorChips ? { corridorChips } : {}),
    }),
  );
}

function isValidPageHome(value: PageHomeDocument): boolean {
  return Boolean(
    value.headline?.trim() ||
      value.headlineEmphasis?.trim() ||
      value.eyebrowText?.trim(),
  );
}

export const getPageHome = cache(async () =>
  cachedPublicCms({
    key: ["page-home-default"],
    tags: ["page_home", "public-cms"],
    load: loadPageHome,
    isValid: isValidPageHome,
    fallback: FALLBACK_PAGE_HOME,
    revalidate: 30,
  }),
);

async function loadLiveVideoCards(): Promise<VideoCardDocument[]> {
  const settings = await getSiteSettings();
  // Hourly sync keeps the library fresh (newest uploads first by position).
  // Homepage always shows the newest N so new videos appear as they sync.
  const libraryLimit = Math.max(
    1,
    Number(settings.youtubeLibraryLimit ?? 50) || 50,
  );
  const homepageCapRaw = Number(settings.youtubeHomepageLimit);
  const homepageCap =
    Number.isFinite(homepageCapRaw) && homepageCapRaw > 0
      ? Math.max(1, homepageCapRaw)
      : 12;
  const library = await listLiveVideoCards(libraryLimit);
  return library.slice(0, homepageCap);
}

export const getLiveVideoCards = cache(async () => {
  try {
    return await loadLiveVideoCards();
  } catch {
    return [];
  }
});

/** Full live library for paid portal dashboards (no homepage slice). */
export const getPortalVideoLibrary = cache(async () => {
  try {
    const settings = await getSiteSettings();
    const limit = Math.max(
      1,
      Number(settings.youtubeLibraryLimit ?? 50) || 50,
    );
    return listLiveVideoCards(limit);
  } catch {
    return [];
  }
});

async function loadLivePodcastEpisodes(): Promise<PodcastEpisodeDocument[]> {
  const snapshot = await adminDb
    .collection("podcast_episodes")
    .where("status", "==", "live")
    .get();
  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      episodeNumber: Number(data.episodeNumber ?? 0),
      title: String(data.title ?? ""),
      guestName: String(data.guestName ?? ""),
      duration: String(data.duration ?? ""),
      audioUrl: String(data.audioUrl ?? ""),
      description: String(data.description ?? ""),
      status: (data.status as PodcastEpisodeDocument["status"]) ?? "draft",
    };
  });
  return items.sort((a, b) => b.episodeNumber - a.episodeNumber);
}

export const getLivePodcastEpisodes = cache(async () => {
  try {
    return await loadLivePodcastEpisodes();
  } catch {
    return [];
  }
});


export async function getPageAbout(): Promise<PageAboutDocument | null> {
  try {
    const snapshot = await adminDb.collection("page_about").doc("default").get();
    const data = snapshot.data() as PageAboutDocument | undefined;
    if (!data) return null;
    const serialized = serializeForClient(data) as PageAboutDocument;
    if (Array.isArray(serialized.teamMembers)) {
      serialized.teamMembers = serialized.teamMembers.map((member) => ({
        ...member,
        photo: resolveStorageUrl(member.photo),
      }));
    }
    return serialized;
  } catch {
    return null;
  }
}

export async function getPageHowItWorks(): Promise<PageHowItWorksDocument | null> {
  try {
    const snapshot = await adminDb
      .collection("page_how_it_works")
      .doc("default")
      .get();
    const data = snapshot.data() as PageHowItWorksDocument | undefined;
    if (!data) return null;
    return serializeForClient(data);
  } catch {
    return null;
  }
}

export async function getPageVisaPath(): Promise<PageVisaPathDocument | null> {
  try {
    const snapshot = await adminDb
      .collection("page_visa_path")
      .doc("default")
      .get();
    const data = snapshot.data() as PageVisaPathDocument | undefined;
    if (!data) return null;
    return serializeForClient(data) as PageVisaPathDocument;
  } catch {
    return null;
  }
}

export async function getPageMarketplace(): Promise<PageMarketplaceDocument> {
  try {
    const snapshot = await adminDb
      .collection("page_marketplace")
      .doc("default")
      .get();
    const data = snapshot.data() as PageMarketplaceDocument | undefined;
    if (!data) {
      return serializeForClient(FALLBACK_PAGE_MARKETPLACE);
    }
    return serializeForClient({
      ...FALLBACK_PAGE_MARKETPLACE,
      ...data,
    }) as PageMarketplaceDocument;
  } catch {
    return serializeForClient(FALLBACK_PAGE_MARKETPLACE);
  }
}

const MOVE_OS_KEYS = [
  "moveOsEyebrow",
  "moveOsHeadline",
  "moveOsSubtext",
  "moveOsDualCommitTitle",
  "moveOsDualCommitBody",
  "moveOsSprintTitle",
  "moveOsSprintBody",
  "moveOsArrivalTitle",
  "moveOsArrivalBody",
  "moveOsCtaLabel",
  "moveOsCtaHref",
] as const;

type MoveOsKey = (typeof MOVE_OS_KEYS)[number];

function withMoveOsFallbacks<T extends Partial<Record<MoveOsKey, string>>>(
  data: T | undefined,
  fallback: T,
): T {
  const base = { ...(data ?? {}) } as T;
  for (const key of MOVE_OS_KEYS) {
    const current = base[key];
    if (typeof current !== "string" || !current.trim()) {
      const fromFallback = fallback[key];
      if (typeof fromFallback === "string" && fromFallback) {
        (base as Partial<Record<MoveOsKey, string>>)[key] = fromFallback;
      }
    }
  }
  return base;
}

export async function getPagePricing(): Promise<PagePricingDocument | null> {
  try {
    const snapshot = await adminDb.collection("page_pricing").doc("default").get();
    const data = snapshot.data() as PagePricingDocument | undefined;
    if (!data) {
      return serializeForClient(FALLBACK_PAGE_PRICING);
    }
    return serializeForClient(
      withMoveOsFallbacks(data, FALLBACK_PAGE_PRICING),
    );
  } catch {
    return serializeForClient(FALLBACK_PAGE_PRICING);
  }
}

export async function getPageTracks(): Promise<PageTracksDocument | null> {
  try {
    const snapshot = await adminDb.collection("page_tracks").doc("default").get();
    const data = snapshot.data() as PageTracksDocument | undefined;
    if (!data) {
      return serializeForClient(FALLBACK_PAGE_TRACKS);
    }
    return serializeForClient(
      withMoveOsFallbacks(data, FALLBACK_PAGE_TRACKS),
    );
  } catch {
    return serializeForClient(FALLBACK_PAGE_TRACKS);
  }
}

export async function getProgramLevers(): Promise<ProgramLeversDocument | null> {
  try {
    const snapshot = await adminDb.collection("program_levers").doc("default").get();
    const data = snapshot.data();

    if (!data) {
      return null;
    }

    return {
      trackAMonthly: data.trackAMonthly ?? 0,
      trackAMatchFee: data.trackAMatchFee ?? 0,
      trackBMonthly: data.trackBMonthly ?? 0,
      placementFeeEur: data.placementFeeEur ?? 350,
      creditsPerEuro: data.creditsPerEuro ?? 4,
      lowCreditThreshold: Number(data.lowCreditThreshold ?? 50) || 50,
      profileUnlockCredits: Number(data.profileUnlockCredits ?? 0) || 0,
      companyUnlockCredits: Number(data.companyUnlockCredits ?? 0) || 0,
      creditTopUpPackages: data.creditTopUpPackages ?? [],
      companyCreditTopUpPackages: data.companyCreditTopUpPackages ?? [],
      waysToEarn: data.waysToEarn ?? [],
      updatedAt: serializeTimestamp(data.updatedAt),
    };
  } catch (error) {
    console.error("getProgramLevers_failed", error);
    return null;
  }
}

/** Editable defaults when the Firestore shell is missing or unreadable. */
export function defaultProgramLevers(): ProgramLeversDocument {
  return {
    trackAMonthly: 50,
    trackAMatchFee: 200,
    trackBMonthly: 125,
    placementFeeEur: 350,
    creditsPerEuro: 4,
    lowCreditThreshold: 50,
    profileUnlockCredits: 0,
    companyUnlockCredits: 0,
    creditTopUpPackages: [
      { id: "pack_400", label: "Starter pack", credits: 400, priceEur: 100 },
      { id: "pack_800", label: "Coach pack", credits: 800, priceEur: 200 },
      { id: "pack_1600", label: "Premium pack", credits: 1600, priceEur: 400 },
    ],
    companyCreditTopUpPackages: [
      {
        id: "company_pack_200",
        label: "Bench starter",
        credits: 200,
        priceEur: 250,
        companyCredits: true,
      },
      {
        id: "company_pack_500",
        label: "Commit pack",
        credits: 500,
        priceEur: 550,
        companyCredits: true,
      },
      {
        id: "company_pack_1000",
        label: "Scale pack",
        credits: 1000,
        priceEur: 1000,
        companyCredits: true,
      },
    ],
    waysToEarn: [
      {
        id: "welcome",
        action: "Welcome credit",
        credits: 2000,
        description: "On signup",
      },
      {
        id: "referral",
        action: "Referral bonus",
        credits: 150,
        description: "Per successful referral",
      },
      {
        id: "profile_complete",
        action: "Profile complete",
        credits: 100,
        description: "One-time",
      },
    ],
    updatedAt: null,
  };
}

export async function getOpenJobPostings(): Promise<JobPostingDocument[]> {
  try {
    const snapshot = await adminDb
      .collection("job_postings")
      .where("status", "==", "open")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? "",
        companyName: data.companyName ?? "",
        department: data.department ?? "",
        location: data.location ?? "",
        salary: data.salary ?? "",
        employmentType: data.employmentType ?? "",
        gender: data.gender ?? "",
        categories: Array.isArray(data.categories) ? data.categories : [],
        skills: Array.isArray(data.skills) ? data.skills : [],
        description: data.description ?? "",
        status: data.status ?? "open",
        createdAt: serializeTimestamp(data.createdAt),
      };
    });
  } catch {
    return [];
  }
}

export async function getJobPosting(id: string): Promise<JobPostingDocument | null> {
  try {
    const snapshot = await adminDb.collection("job_postings").doc(id).get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data()!;

    if (data.status !== "open") {
      return null;
    }

    return {
      id: snapshot.id,
      title: data.title ?? "",
      companyName: data.companyName ?? "",
      department: data.department ?? "",
      location: data.location ?? "",
      salary: data.salary ?? "",
      employmentType: data.employmentType ?? "",
      gender: data.gender ?? "",
      categories: Array.isArray(data.categories) ? data.categories : [],
      skills: Array.isArray(data.skills) ? data.skills : [],
      description: data.description ?? "",
      status: data.status ?? "open",
      createdAt: serializeTimestamp(data.createdAt),
    };
  } catch {
    return null;
  }
}

export async function getPublishedArticles(): Promise<ArticleDocument[]> {
  try {
    const snapshot = await adminDb
      .collection("articles")
      .where("status", "==", "published")
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title ?? "",
          slug: data.slug ?? doc.id,
          coverImageUrl: resolveStorageUrl(data.coverImageUrl),
          excerpt: data.excerpt ?? "",
          body: data.body ?? "",
          author: data.author ?? "",
          category: data.category ?? "",
          publishedDate: serializeTimestamp(data.publishedDate),
          tags: data.tags ?? [],
          status: data.status ?? "published",
          createdAt: serializeTimestamp(data.createdAt),
        };
      })
      .sort((a, b) => {
        const aTime = a.publishedDate ? Date.parse(a.publishedDate) : 0;
        const bTime = b.publishedDate ? Date.parse(b.publishedDate) : 0;
        return bTime - aTime;
      });
  } catch {
    return [];
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleDocument | null> {
  try {
    const snapshot = await adminDb
      .collection("articles")
      .where("slug", "==", slug)
      .where("status", "==", "published")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0]!;
    const data = doc.data();

    return {
      id: doc.id,
      title: data.title ?? "",
      slug: data.slug ?? doc.id,
      coverImageUrl: resolveStorageUrl(data.coverImageUrl),
      excerpt: data.excerpt ?? "",
      body: data.body ?? "",
      author: data.author ?? "",
      category: data.category ?? "",
      publishedDate: serializeTimestamp(data.publishedDate),
      tags: data.tags ?? [],
      status: data.status ?? "published",
      createdAt: serializeTimestamp(data.createdAt),
    };
  } catch {
    return null;
  }
}

export async function getOpenPublicRoles(): Promise<PublicRoleDocument[]> {
  try {
    const snapshot = await adminDb
      .collection("public_roles")
      .where("status", "==", "open")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? "",
        employerLabel: data.employerLabel ?? "",
        sector: data.sector ?? "",
        location: data.location ?? "",
        seniority: data.seniority ?? "",
        relocationSupport: Boolean(data.relocationSupport),
        description: data.description ?? "",
        status: data.status ?? "open",
        createdAt: serializeTimestamp(data.createdAt),
      };
    });
  } catch {
    return [];
  }
}

export async function getPublicRole(id: string): Promise<PublicRoleDocument | null> {
  try {
    const snapshot = await adminDb.collection("public_roles").doc(id).get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data()!;

    if (data.status !== "open") {
      return null;
    }

    return {
      id: snapshot.id,
      title: data.title ?? "",
      employerLabel: data.employerLabel ?? "",
      sector: data.sector ?? "",
      location: data.location ?? "",
      seniority: data.seniority ?? "",
      relocationSupport: Boolean(data.relocationSupport),
      description: data.description ?? "",
      status: data.status ?? "open",
      createdAt: serializeTimestamp(data.createdAt),
    };
  } catch {
    return null;
  }
}

export async function getLiveContentItems(): Promise<ContentItemDocument[]> {
  try {
    const snapshot = await adminDb
      .collection("content_items")
      .where("status", "==", "live")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const fileRef = resolveStorageFileRef(data.fileUrl ?? data.file);
      return {
        id: doc.id,
        title: data.title ?? "",
        type: data.type ?? "download",
        description: data.description ?? "",
        thumbnailUrl:
          typeof data.thumbnailUrl === "string"
            ? data.thumbnailUrl
            : resolveStorageFileRef(data.thumbnailUrl)?.url ?? "",
        fileUrl: fileRef?.url ?? "",
        costCredits: data.costCredits ?? 0,
        category: data.category ?? "",
        status: data.status ?? "live",
        createdAt: serializeTimestamp(data.createdAt),
      };
    });
  } catch {
    return [];
  }
}
