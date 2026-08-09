import Link from "next/link";
import { getPageVisaPath } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { listStudentEvidence } from "@/lib/move-os/evidence";
import { FALLBACK_PAGE_VISA_PATH } from "@/lib/public/cms-fallbacks";
import { getStudentSession } from "@/lib/student/session";
import type { VisaPathCorridor } from "@/types/cms";
import { SectionEyebrow } from "@/components/ui";

function corridorKinds(corridor: VisaPathCorridor): string[] {
  const set = new Set<string>();
  for (const step of corridor.steps ?? []) {
    for (const kind of step.evidenceKinds ?? []) {
      const value = String(kind ?? "").trim();
      if (value) set.add(value);
    }
  }
  return [...set];
}

/** Match role location to a corridor label; else first corridor's kinds. */
export function requiredEvidenceKindsForRole(
  corridors: VisaPathCorridor[],
  location: string,
): string[] {
  const list = (corridors ?? []).filter((c) => c?.id || c?.label);
  if (!list.length) return [];

  const loc = location.trim().toLowerCase();
  const matched = loc
    ? list.filter((corridor) => {
        const label = String(corridor.label ?? "").trim().toLowerCase();
        if (!label) return false;
        if (loc.includes(label) || label.includes(loc)) return true;
        return label
          .split(/[→\-–,|/]/)
          .map((part) => part.trim())
          .filter((part) => part.length > 2)
          .some((part) => loc.includes(part));
      })
    : [];

  const source = matched.length ? matched : list.slice(0, 1);
  const set = new Set<string>();
  for (const corridor of source) {
    for (const kind of corridorKinds(corridor)) set.add(kind);
  }
  return [...set];
}

export async function RoleReadinessTeaser({
  roleLocation,
}: {
  roleLocation: string;
}) {
  const [settings, visaPath, session] = await Promise.all([
    getSiteSettings(),
    getPageVisaPath(),
    getStudentSession(),
  ]);

  const pageLabels = settings.pageLabels ?? {};
  const eyebrow = pageLabels.roleReadinessEyebrow;
  const matchLabel = pageLabels.roleReadinessMatchLabel;
  const anonTeaser = pageLabels.roleReadinessAnonTeaser;
  const signUpCta = pageLabels.roleReadinessSignUpCta;
  const signUpHref = pageLabels.roleReadinessSignUpHref || "/sign-up";

  if (!eyebrow && !matchLabel && !anonTeaser) {
    return null;
  }

  const corridors =
    (visaPath ?? FALLBACK_PAGE_VISA_PATH).corridors ??
    FALLBACK_PAGE_VISA_PATH.corridors ??
    [];
  const required = requiredEvidenceKindsForRole(corridors, roleLocation);

  if (session) {
    let present = 0;
    try {
      const items = await listStudentEvidence(session.studentId);
      const have = new Set(
        items.map((item) => String(item.kind ?? "").toLowerCase()).filter(Boolean),
      );
      present = required.filter((kind) => have.has(kind.toLowerCase())).length;
    } catch {
      present = 0;
    }

    const label = (matchLabel || "")
      .replace("{present}", String(present))
      .replace("{required}", String(required.length));

    return (
      <aside className="rounded-radius border border-border bg-surface-2/60 px-4 py-3">
        {eyebrow ? <SectionEyebrow className="mb-2">{eyebrow}</SectionEyebrow> : null}
        {label ? (
          <p className="text-sm font-medium text-text-primary">{label}</p>
        ) : null}
      </aside>
    );
  }

  if (!anonTeaser && !signUpCta) return null;

  return (
    <aside className="space-y-3 rounded-radius border border-border bg-surface-2/60 px-4 py-3">
      {eyebrow ? <SectionEyebrow className="mb-0">{eyebrow}</SectionEyebrow> : null}
      {anonTeaser ? (
        <p className="text-sm text-text-secondary">{anonTeaser}</p>
      ) : null}
      {signUpCta ? (
        <Link
          href={signUpHref}
          className="inline-flex items-center justify-center rounded-radius bg-fill-primary px-3 py-2 text-sm font-medium text-on-primary"
        >
          {signUpCta}
        </Link>
      ) : null}
    </aside>
  );
}
