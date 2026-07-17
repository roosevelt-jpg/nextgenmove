import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { serializeTimestamp } from "@/lib/firestore-utils";

const jobSchema = z.object({
  title: z.string().trim().min(1).max(160),
  companyName: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().min(1).max(8000),
  location: z.string().trim().min(1).max(120),
  salary: z.string().trim().max(120).optional(),
  employmentType: z.enum(["full_time", "part_time", "internship", "freelance"]),
  gender: z.string().trim().max(40).optional(),
  categories: z.array(z.string().trim().min(1)).min(1).max(12),
  skills: z.array(z.string().trim().min(1)).max(40).optional(),
  postedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const snap = await adminDb
    .collection("job_postings")
    .where("companyId", "==", session.companyId)
    .get();

  const items = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? ""),
        companyName: String(data.companyName ?? session.company.name),
        description: String(data.description ?? ""),
        location: String(data.location ?? ""),
        salary: String(data.salary ?? ""),
        employmentType: String(data.employmentType ?? ""),
        gender: String(data.gender ?? ""),
        categories: Array.isArray(data.categories) ? data.categories : [],
        skills: Array.isArray(data.skills) ? data.skills : [],
        status: String(data.status ?? "pending"),
        postedAt: serializeTimestamp(data.postedAt),
        expiresAt: serializeTimestamp(data.expiresAt),
        createdAt: serializeTimestamp(data.createdAt),
      };
    })
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();
  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const body = jobSchema.parse(await request.json());
    const ref = adminDb.collection("job_postings").doc();
    const now = FieldValue.serverTimestamp();
    const payload = stripUndefined({
      id: ref.id,
      companyId: session.companyId,
      companyName: body.companyName?.trim() || session.company.name,
      title: body.title,
      description: body.description,
      location: body.location,
      salary: body.salary?.trim() || "",
      employmentType: body.employmentType,
      gender: body.gender?.trim() || "",
      categories: body.categories,
      skills: body.skills ?? [],
      department: body.categories[0] ?? "",
      status: "pending",
      moderationStatus: "pending",
      postedAt: body.postedAt ? new Date(body.postedAt) : now,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdAt: now,
      updatedAt: now,
    });
    await ref.set(payload);
    return NextResponse.json({ id: ref.id, status: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("employer_job_create_failed", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
