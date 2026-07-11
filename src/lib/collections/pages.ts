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
} from "@/types/cms";

export async function getPageHome(): Promise<PageHomeDocument | null> {
  try {
    const snapshot = await adminDb.collection("page_home").doc("default").get();
    return (snapshot.data() as PageHomeDocument | undefined) ?? null;
  } catch {
    return null;
  }
}

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
  } catch {
    return null;
  }
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
