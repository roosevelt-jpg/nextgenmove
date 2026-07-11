import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const snapshot = await adminDb.collection("integrations").get();

    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      const config =
        data.config && typeof data.config === "object" && !Array.isArray(data.config)
          ? Object.fromEntries(
              Object.entries(data.config as Record<string, unknown>).map(
                ([key, value]) => [key, value == null ? "" : String(value)],
              ),
            )
          : {};

      return {
        id: doc.id,
        name: String(data.name ?? ""),
        description: String(data.description ?? ""),
        category: String(data.category ?? config.category ?? ""),
        iconUrl: String(data.iconUrl ?? ""),
        status: data.status === "connected" ? "connected" : "not_connected",
        connectedAt: serializeTimestamp(data.connectedAt),
        config,
      };
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("integrations_list_failed", error);
    return NextResponse.json({ error: "list_failed", items: [] }, { status: 500 });
  }
}
