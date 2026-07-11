import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { serializeTimestamp } from "@/lib/firestore-utils";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import {
  INTEGRATION_CATALOG,
  mergeIntegrationCatalog,
  type IntegrationShell,
} from "@/lib/admin/integration-catalog";
import { stripUndefined } from "@/lib/stripUndefined";

export const dynamic = "force-dynamic";

const READ_TIMEOUT_MS = 4000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mapDoc(
  id: string,
  data: Record<string, unknown>,
): IntegrationShell {
  const rawConfig = data.config;
  const config =
    rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)
      ? Object.fromEntries(
          Object.entries(rawConfig as Record<string, unknown>).map(
            ([key, value]) => [key, value == null ? "" : String(value)],
          ),
        )
      : {};

  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    category: String(data.category ?? config.category ?? ""),
    iconUrl: String(data.iconUrl ?? ""),
    status: data.status === "connected" ? "connected" : "not_connected",
    connectedAt: serializeTimestamp(
      data.connectedAt as Parameters<typeof serializeTimestamp>[0],
    ),
    config,
  };
}

async function ensureYoutubeShell() {
  const ref = adminDb.collection("integrations").doc("youtube");
  const snap = await withTimeout(ref.get(), READ_TIMEOUT_MS);
  if (snap.exists) return;
  await withTimeout(
    ref.set(
      stripUndefined({
        ...INTEGRATION_CATALOG.find((item) => item.id === "youtube"),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ),
    READ_TIMEOUT_MS,
  );
}

async function loadLiveIntegrations(): Promise<IntegrationShell[]> {
  try {
    const snapshot = await withTimeout(
      adminDb.collection("integrations").get(),
      READ_TIMEOUT_MS,
    );
    return snapshot.docs.map((doc) => mapDoc(doc.id, doc.data() as Record<string, unknown>));
  } catch (collectionError) {
    console.error("integrations_collection_failed", collectionError);
  }

  // Per-doc fallback when the collection query hangs/fails under quota.
  const settled = await Promise.allSettled(
    INTEGRATION_CATALOG.map(async (shell) => {
      const snap = await withTimeout(
        adminDb.collection("integrations").doc(shell.id).get(),
        READ_TIMEOUT_MS,
      );
      if (!snap.exists) return null;
      return mapDoc(snap.id, snap.data() as Record<string, unknown>);
    }),
  );

  return settled
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((item): item is IntegrationShell => Boolean(item));
}

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  void ensureYoutubeShell().catch((error) => {
    console.error("youtube_integration_shell_ensure_failed", error);
  });

  try {
    const live = await loadLiveIntegrations();
    const items = mergeIntegrationCatalog(live);
    const degraded = live.length === 0;

    return NextResponse.json(
      {
        items,
        ...(degraded ? { warning: "integrations_degraded" } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("integrations_list_failed", error);
    // Never blank the page — show catalog shells so admins can reconnect.
    return NextResponse.json(
      {
        items: mergeIntegrationCatalog([]),
        warning: "integrations_degraded",
        error: "list_failed",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
