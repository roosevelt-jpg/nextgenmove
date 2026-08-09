import { Suspense } from "react";
import { VisaPathSimulator } from "@/components/public/visa-path-simulator";
import { getPageVisaPath } from "@/lib/collections/pages";
import { FALLBACK_PAGE_VISA_PATH } from "@/lib/public/cms-fallbacks";
import { getStudentSession } from "@/lib/student/session";
import { listStudentEvidence } from "@/lib/move-os/evidence";

export const dynamic = "force-dynamic";

export default async function VisaPathPage() {
  const page = (await getPageVisaPath()) ?? FALLBACK_PAGE_VISA_PATH;
  const session = await getStudentSession();
  let studentEvidenceKinds: string[] | null = null;
  if (session) {
    try {
      const items = await listStudentEvidence(session.studentId);
      studentEvidenceKinds = [
        ...new Set(items.map((item) => item.kind).filter(Boolean)),
      ];
    } catch {
      studentEvidenceKinds = [];
    }
  }

  return (
    <div className="page-section">
      <Suspense fallback={null}>
        <VisaPathSimulator
          page={page}
          isStudent={Boolean(session)}
          studentEvidenceKinds={studentEvidenceKinds}
        />
      </Suspense>
    </div>
  );
}
