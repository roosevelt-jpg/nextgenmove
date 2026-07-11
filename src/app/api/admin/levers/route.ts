import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getProgramLevers, defaultProgramLevers } from "@/lib/collections/pages";
import { serializeTimestamp } from "@/lib/firestore-utils";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { revalidateAdminCollection } from "@/lib/admin/revalidate";
import { stripUndefined } from "@/lib/stripUndefined";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const levers = (await getProgramLevers()) ?? defaultProgramLevers();
    return NextResponse.json(
      { levers },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("levers_get_failed", error);
    return NextResponse.json(
      { levers: defaultProgramLevers() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

const waySchema = z.object({
  id: z.string(),
  action: z.string(),
  credits: z.number(),
  description: z.string(),
});

const packageSchema = z.object({
  id: z.string(),
  label: z.string(),
  credits: z.number(),
  priceEur: z.number(),
});

const patchSchema = z.object({
  trackAMonthly: z.number().optional(),
  trackAMatchFee: z.number().optional(),
  trackBMonthly: z.number().optional(),
  placementFeeEur: z.number().optional(),
  creditsPerEuro: z.number().optional(),
  creditTopUpPackages: z.array(packageSchema).optional(),
  waysToEarn: z.array(waySchema).optional(),
});

export async function PATCH(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = patchSchema.parse(await request.json());

    await adminDb
      .collection("program_levers")
      .doc("default")
      .set(
        {
          ...stripUndefined({
            id: "default",
            ...body,
          }),
          // Keep FieldValue outside stripUndefined (older builds ate the sentinel → {}).
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    revalidateAdminCollection("program_levers");

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "program_levers_updated",
      targetType: "program_levers",
      targetId: "default",
    });

    const snapshot = await adminDb.collection("program_levers").doc("default").get();
    const data = snapshot.data() ?? {};

    return NextResponse.json({
      levers: {
        trackAMonthly: data.trackAMonthly ?? 0,
        trackAMatchFee: data.trackAMatchFee ?? 0,
        trackBMonthly: data.trackBMonthly ?? 0,
        placementFeeEur: data.placementFeeEur ?? 350,
        creditsPerEuro: data.creditsPerEuro ?? 4,
        creditTopUpPackages: data.creditTopUpPackages ?? [],
        waysToEarn: data.waysToEarn ?? [],
        updatedAt: serializeTimestamp(data.updatedAt),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("levers_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
