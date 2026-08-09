import { adminDb } from "@/lib/firebase-admin";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { isPubliclyPublished } from "@/lib/cms/publish-visibility";

/**
 * Build live platform context for NGM Assistant / public chat.
 * Aggregate and public-safe only — no deal terms, PII, or confidential company details.
 */
export async function buildAssistantContext(): Promise<string> {
  const chunks: string[] = [];

  try {
    const settings = await getSiteSettings();
    if (settings.siteName) chunks.push(`Site name: ${settings.siteName}`);
    if (settings.tagline) chunks.push(`Tagline: ${settings.tagline}`);
  } catch {
    // ignore
  }

  try {
    const faqSnap = await adminDb
      .collection("cms_pages")
      .where("status", "==", "published")
      .limit(8)
      .get();
    const faqBits: string[] = [];
    for (const doc of faqSnap.docs) {
      const data = doc.data();
      if (!isPubliclyPublished(data)) continue;
      const title = String(data.title ?? data.slug ?? "").trim();
      const body = String(data.body ?? data.metaDescription ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);
      if (title && body) faqBits.push(`- ${title}: ${body}`);
    }
    if (faqBits.length) {
      chunks.push(`FAQ / published pages:\n${faqBits.join("\n")}`);
    }
  } catch {
    // ignore
  }

  try {
    const jobsSnap = await adminDb
      .collection("job_postings")
      .where("status", "==", "open")
      .limit(24)
      .get();
    const roles = jobsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        title: String(d.title ?? ""),
        location: String(d.location ?? ""),
        type: String(d.employmentType ?? ""),
        skills: Array.isArray(d.skills) ? d.skills.map(String) : [],
      };
    });
    if (roles.length) {
      chunks.push(
        `Open positions (titles/locations only):\n${roles
          .map(
            (r) =>
              `- ${r.title}${r.location ? ` · ${r.location}` : ""}${r.type ? ` · ${r.type}` : ""}`,
          )
          .join("\n")}`,
      );
      const skillCounts = new Map<string, number>();
      for (const role of roles) {
        for (const skill of role.skills) {
          const key = skill.trim();
          if (!key) continue;
          skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1);
        }
      }
      const topSkills = [...skillCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([skill, n]) => `${skill} (${n})`);
      if (topSkills.length) {
        chunks.push(`Skills currently in demand (aggregate): ${topSkills.join(", ")}`);
      }
    }
  } catch {
    // ignore
  }

  try {
    const studentsSnap = await adminDb.collection("students").limit(80).get();
    const nationalityCounts = new Map<string, number>();
    for (const doc of studentsSnap.docs) {
      const nationality = String(doc.data().nationality ?? "").trim();
      if (!nationality) continue;
      nationalityCounts.set(
        nationality,
        (nationalityCounts.get(nationality) ?? 0) + 1,
      );
    }
    const topNationalities = [...nationalityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, n]) => `${name} (${n})`);
    if (topNationalities.length) {
      chunks.push(
        `Talent nationalities represented (aggregate pool counts, not employer demand deals): ${topNationalities.join(", ")}`,
      );
    }
  } catch {
    // ignore
  }

  try {
    const homeSnap = await adminDb.collection("page_home").doc("default").get();
    const home = homeSnap.data() ?? {};
    const dates: string[] = [];
    if (home.storiesManagedLabel) {
      dates.push(String(home.storiesManagedLabel));
    }
    if (Array.isArray(home.currentRoutesItems)) {
      for (const item of home.currentRoutesItems as Array<Record<string, string>>) {
        const label = [item.code, item.label].filter(Boolean).join(" — ");
        if (label) dates.push(label);
      }
    }
    if (dates.length) {
      chunks.push(`Notable routes / labels: ${dates.join("; ")}`);
    }
  } catch {
    // ignore
  }

  if (!chunks.length) {
    return "No live CMS context available. Answer from general Nextgenmove product knowledge only.";
  }

  return `Live platform context (use this; do not invent confidential details):\n${chunks.join("\n\n")}`;
}
