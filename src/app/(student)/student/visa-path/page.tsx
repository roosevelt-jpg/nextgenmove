import { redirect } from "next/navigation";
import { VisaPathSimulator } from "@/components/public/visa-path-simulator";
import { getPageVisaPath } from "@/lib/collections/pages";
import { FALLBACK_PAGE_VISA_PATH } from "@/lib/public/cms-fallbacks";
import { getStudentSession } from "@/lib/student/session";
import { listStudentEvidence } from "@/lib/move-os/evidence";

export const dynamic = "force-dynamic";

export default async function StudentVisaPathPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/sign-in?next=/student/visa-path");
  }

  const page = (await getPageVisaPath()) ?? FALLBACK_PAGE_VISA_PATH;
  let studentEvidenceKinds: string[] = [];
  try {
    const items = await listStudentEvidence(session.studentId);
    studentEvidenceKinds = [
      ...new Set(items.map((item) => item.kind).filter(Boolean)),
    ];
  } catch {
    studentEvidenceKinds = [];
  }

  return (
    <div className="space-y-4">
      <VisaPathSimulator
        page={page}
        isStudent
        studentEvidenceKinds={studentEvidenceKinds}
      />
    </div>
  );
}
