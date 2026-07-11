import { cache } from "react";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import type {
  ArticleDocument,
  ContentItemDocument,
  JobPostingDocument,
  PageAboutDocument,
  PageHomeDocument,
  PageHowItWorksDocument,
  PagePricingDocument,
  PageTracksDocument,
  ProgramLeversDocument,
  PublicRoleDocument,
  PodcastEpisodeDocument,
  VideoCardDocument,
} from "@/types/cms";
import { cachedPublicCms } from "@/lib/public/cms-cache";
import { FALLBACK_PAGE_HOME } from "@/lib/public/cms-fallbacks";
import { mergePageHome } from "@/lib/public/merge-page-home";

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

  return mergePageHome({
    ...data,
    ...(corridorChips ? { corridorChips } : {}),
  });
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
  const snapshot = await adminDb
    .collection("video_cards")
    .where("status", "==", "live")
    .get();
  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title ?? ""),
      subtitle: String(data.subtitle ?? ""),
      videoUrl: String(data.videoUrl ?? ""),
      duration: String(data.duration ?? ""),
      thumbnailUrl: String(data.thumbnailUrl ?? ""),
      position: Number(data.position ?? 0),
      status: (data.status as VideoCardDocument["status"]) ?? "draft",
    };
  });
  return items.sort((a, b) => a.position - b.position);
}

export const getLiveVideoCards = cache(async () => {
  try {
    return await loadLiveVideoCards();
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
    return (snapshot.data() as PageAboutDocument | undefined) ?? null;
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
    return (snapshot.data() as PageHowItWorksDocument | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function getPagePricing(): Promise<PagePricingDocument | null> {
  try {
    const snapshot = await adminDb.collection("page_pricing").doc("default").get();
    return (snapshot.data() as PagePricingDocument | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function getPageTracks(): Promise<PageTracksDocument | null> {
  try {
    const snapshot = await adminDb.collection("page_tracks").doc("default").get();
    return (snapshot.data() as PageTracksDocument | undefined) ?? null;
  } catch {
    return null;
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
      creditTopUpPackages: data.creditTopUpPackages ?? [],
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
    creditTopUpPackages: [
      { id: "pack_400", label: "Starter pack", credits: 400, priceEur: 100 },
      { id: "pack_800", label: "Coach pack", credits: 800, priceEur: 200 },
      { id: "pack_1600", label: "Premium pack", credits: 1600, priceEur: 400 },
    ],
    waysToEarn: [],
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
        department: data.department ?? "",
        location: data.location ?? "",
        employmentType: data.employmentType ?? "",
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
      department: data.department ?? "",
      location: data.location ?? "",
      employmentType: data.employmentType ?? "",
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
          coverImageUrl: data.coverImageUrl ?? "",
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
      coverImageUrl: data.coverImageUrl ?? "",
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
      return {
        id: doc.id,
        title: data.title ?? "",
        type: data.type ?? "download",
        description: data.description ?? "",
        thumbnailUrl: data.thumbnailUrl ?? "",
        fileUrl: data.fileUrl ?? "",
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
