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
import { withTimeout } from "@/lib/async/with-timeout";

export const dynamic = "force-dynamic";

const READ_TIMEOUT_MS = 4000;

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

function envMarksConnected(id: string): boolean {
  if (id === "resend") {
    const key = process.env.RESEND_API_KEY?.trim() ?? "";
    const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
    return key.startsWith("re_") && from.includes("@");
  }
  if (id === "stripe") {
    return Boolean(process.env.STRIPE_SECRET_KEY?.trim()?.startsWith("sk_"));
  }
  if (id === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim(),
    );
  }
  if (id === "youtube") {
    return Boolean(
      process.env.YOUTUBE_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim(),
    );
  }
  if (id === "google_places") {
    return Boolean(
      process.env.GOOGLE_PLACES_API_KEY?.trim() ||
        process.env.GOOGLE_MAPS_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim(),
    );
  }
  if (id === "gmail_smtp") {
    const user = process.env.SMTP_USER?.trim() ?? "";
    const pass = process.env.SMTP_PASS?.trim() ?? "";
    return user.includes("@") && Boolean(pass);
  }
  return false;
}

function applyEnvConnectedStatus(items: IntegrationShell[]): IntegrationShell[] {
  return items.map((item) => {
    if (item.status === "connected") return item;
    if (!envMarksConnected(item.id)) return item;
    return {
      ...item,
      status: "connected",
      connectedAt: item.connectedAt ?? new Date().toISOString(),
      config: {
        ...item.config,
        source: "env",
      },
    };
  });
}

async function ensureYoutubeShell() {
  const ref = adminDb.collection("integrations").doc("youtube");
  const snap = await withTimeout(ref.get(), READ_TIMEOUT_MS, "youtube_shell_get");
  if (snap.exists) return;
  await withTimeout(
    ref.set(
      stripUndefined({
        ...INTEGRATION_CATALOG.find((item) => item.id === "youtube"),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ),
    READ_TIMEOUT_MS,
    "youtube_shell_set",
  );
}

async function loadLiveIntegrations(): Promise<IntegrationShell[]> {
  try {
    const snapshot = await withTimeout(
      adminDb.collection("integrations").get(),
      READ_TIMEOUT_MS,
      "integrations_list",
    );
    return snapshot.docs.map((doc) =>
      mapDoc(doc.id, doc.data() as Record<string, unknown>),
    );
  } catch (collectionError) {
    console.error("integrations_collection_failed", collectionError);
  }

  const settled = await Promise.allSettled(
    INTEGRATION_CATALOG.map(async (shell) => {
      const snap = await withTimeout(
        adminDb.collection("integrations").doc(shell.id).get(),
        READ_TIMEOUT_MS,
        `integration_${shell.id}`,
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
    const items = applyEnvConnectedStatus(mergeIntegrationCatalog(live));
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
    return NextResponse.json(
      {
        items: applyEnvConnectedStatus(mergeIntegrationCatalog([])),
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
