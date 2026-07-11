import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import { stripUndefined } from "@/lib/stripUndefined";

export const dynamic = "force-dynamic";

const YOUTUBE_SHELL = {
  id: "youtube",
  name: "YouTube",
  category: "Media",
  description:
    "YouTube Data API — sync a playlist into homepage Stories and paid portal video libraries.",
  iconUrl: "",
  status: "not_connected" as const,
  connectedAt: null,
  config: { category: "Media" },
};

async function ensureYoutubeShell() {
  const ref = adminDb.collection("integrations").doc("youtube");
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set(
    stripUndefined({
      ...YOUTUBE_SHELL,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );
}

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    try {
      await ensureYoutubeShell();
    } catch (error) {
      console.error("youtube_integration_shell_ensure_failed", error);
    }

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

    // If Firestore still lacks the shell (e.g. quota), surface it in the UI anyway.
    if (!items.some((item) => item.id === "youtube")) {
      items.push({
        id: YOUTUBE_SHELL.id,
        name: YOUTUBE_SHELL.name,
        description: YOUTUBE_SHELL.description,
        category: YOUTUBE_SHELL.category,
        iconUrl: YOUTUBE_SHELL.iconUrl,
        status: YOUTUBE_SHELL.status,
        connectedAt: null,
        config: YOUTUBE_SHELL.config,
      });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("integrations_list_failed", error);
    return NextResponse.json({ error: "list_failed", items: [] }, { status: 500 });
  }
}
