import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";

export async function GET() {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const snapshot = await adminDb.collection("pipeline_stages").get();

    const stages = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name ?? "",
          order: data.order ?? 0,
          color: data.color ?? "",
          isTerminal: Boolean(data.isTerminal),
        };
      })
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({ stages });
  } catch (error) {
    console.error("pipeline_stages_failed", error);
    return NextResponse.json({ stages: [] });
  }
}
