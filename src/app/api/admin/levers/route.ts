import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getProgramLevers } from "@/lib/collections/pages";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { withTimeout } from "@/lib/async/with-timeout";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { revalidateAdminCollection } from "@/lib/admin/revalidate";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  finiteNumber,
  optionalString,
} from "@/lib/validation/fields";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const levers = await withTimeout(getProgramLevers(), 5000, "program_levers");
    if (!levers) {
      return NextResponse.json(
        { levers: null, warning: "levers_missing" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { levers },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("levers_get_failed", error);
    return NextResponse.json(
      { levers: null, warning: "levers_degraded" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

const waySchema = z.object({
  id: optionalString,
  action: optionalString,
  credits: finiteNumber,
  description: optionalString,
});

const packageSchema = z.object({
  id: optionalString,
  label: optionalString,
  credits: finiteNumber,
  priceEur: finiteNumber,
});

const patchSchema = z.object({
  trackAMonthly: finiteNumber.optional(),
  trackAMatchFee: finiteNumber.optional(),
  trackBMonthly: finiteNumber.optional(),
  placementFeeEur: finiteNumber.optional(),
  creditsPerEuro: finiteNumber.optional(),
  creditTopUpPackages: z.array(packageSchema).optional(),
  waysToEarn: z.array(waySchema).optional(),
});

export async function PATCH(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const raw = (await request.json()) as Record<string, unknown>;
    // Clients may echo hydrate fields; never write them back.
    delete raw.updatedAt;
    delete raw.id;
    const body = patchSchema.parse(raw);

    await adminDb
      .collection("program_levers")
      .doc("default")
      .set(
        {
          ...stripUndefined({
            id: "default",
            ...body,
          }),
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
      return NextResponse.json(
        { error: "invalid_request", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("levers_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
