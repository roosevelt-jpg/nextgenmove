import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getPagePricing, getProgramLevers } from "@/lib/collections/pages";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

export async function GET() {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const [pricing, programLevers] = await Promise.all([
    getPagePricing(),
    getProgramLevers(),
  ]);

  return NextResponse.json({
    company: session.company,
    pricing,
    programLevers,
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  contactEmail: z.string().email().optional(),
  logoUrl: z.string().url().nullable().optional(),
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
  requirements: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        fileUrl: z.string().url(),
        uploadedAt: z.string(),
      }),
    )
    .optional(),
});

export async function PATCH(request: Request) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = patchSchema.parse(await request.json());

    await adminDb
      .collection("companies")
      .doc(session.companyId)
      .update(stripUndefined(body));

    const updated = await adminDb.collection("companies").doc(session.companyId).get();

    return NextResponse.json({ company: { id: updated.id, ...updated.data() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("company_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

const requirementSchema = z.object({
  title: z.string().trim().min(1),
  fileUrl: z.string().url(),
});

export async function POST(request: Request) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = requirementSchema.parse(await request.json());
    const requirement = {
      id: crypto.randomUUID(),
      title: body.title,
      fileUrl: body.fileUrl,
      uploadedAt: new Date().toISOString(),
    };

    await adminDb
      .collection("companies")
      .doc(session.companyId)
      .update(
        stripUndefined({
          requirements: FieldValue.arrayUnion(requirement),
        }),
      );

    return NextResponse.json({ requirement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("requirement_add_failed", error);
    return NextResponse.json({ error: "add_failed" }, { status: 500 });
  }
}
