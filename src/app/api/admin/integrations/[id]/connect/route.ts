import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  getIntegrationSecrets,
  secretsSatisfyIntegration,
  storeIntegrationSecret,
} from "@/lib/admin/integration-secrets";
import { INTEGRATION_CATALOG } from "@/lib/admin/integration-catalog";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { stripUndefined } from "@/lib/stripUndefined";

const connectSchema = z.object({
  config: z.record(z.string(), z.string()).optional(),
  secrets: z.record(z.string(), z.string()).optional(),
});

const ENV_ONLY_IDS = new Set(["firebase_admin", "firebase_client"]);

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Quota exceeded") ||
    message.includes("timeout")
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  try {
    if (ENV_ONLY_IDS.has(id)) {
      return NextResponse.json({ error: "env_only" }, { status: 400 });
    }

    const body = connectSchema.parse(await request.json());
    const ref = adminDb.collection("integrations").doc(id);
    let existing: Record<string, unknown> = {};
    const catalog = INTEGRATION_CATALOG.find((item) => item.id === id);

    try {
      const snapshot = await ref.get();
      existing = snapshot.data() ?? {};
    } catch (readError) {
      if (isQuotaError(readError)) {
        console.error("integration_connect_failed", readError);
        return NextResponse.json(
          { error: "service_unavailable" },
          { status: 503 },
        );
      }
      throw readError;
    }

    const incomingSecrets = Object.fromEntries(
      Object.entries(body.secrets ?? {}).filter(
        ([, value]) => typeof value === "string" && value.trim().length > 0,
      ),
    );
    const existingSecrets = await getIntegrationSecrets(id);
    const mergedSecrets = { ...existingSecrets, ...incomingSecrets };

    if (!secretsSatisfyIntegration(id, mergedSecrets)) {
      return NextResponse.json({ error: "missing_secrets" }, { status: 400 });
    }

    if (Object.keys(incomingSecrets).length > 0) {
      await storeIntegrationSecret(id, incomingSecrets);
    }

    const existingConfig =
      typeof existing.config === "object" && existing.config
        ? { ...(existing.config as Record<string, string>) }
        : {};
    delete existingConfig.adminDisabled;

    // Upsert shell if missing so Connect never 404s on a fresh project.
    await ref.set(
      stripUndefined({
        id,
        name: existing.name || catalog?.name || id,
        description: existing.description || catalog?.description || "",
        category:
          existing.category ||
          body.config?.category ||
          catalog?.category ||
          "",
        iconUrl: existing.iconUrl || catalog?.iconUrl || "",
        status: "connected",
        connectedAt: FieldValue.serverTimestamp(),
        config: {
          ...existingConfig,
          ...(body.config ?? {}),
        },
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

    void logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "integration_connected",
      targetType: "integrations",
      targetId: id,
    }).catch(() => undefined);

    if (id === "youtube") {
      void import("@/lib/media/youtube-sync")
        .then(({ syncYoutubePlaylistVideos }) => syncYoutubePlaylistVideos())
        .catch((error) =>
          console.error("youtube_sync_on_connect_failed", error),
        );
    }

    let data: Record<string, unknown> = {
      name: existing.name || id,
      description: existing.description || "",
      iconUrl: existing.iconUrl || "",
      status: "connected",
      config: {
        ...(typeof existing.config === "object" && existing.config
          ? (existing.config as Record<string, unknown>)
          : {}),
        ...(body.config ?? {}),
      },
    };

    try {
      const updated = await ref.get();
      if (updated.exists) {
        data = updated.data() ?? data;
      }
    } catch {
      // Return optimistic payload if the read-back fails.
    }

    return NextResponse.json({
      item: {
        id,
        name: data.name ?? "",
        description: data.description ?? "",
        iconUrl: data.iconUrl ?? "",
        status: data.status ?? "connected",
        config: data.config ?? {},
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error("integration_connect_failed", error);
    if (isQuotaError(error)) {
      return NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "connect_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  try {
    if (ENV_ONLY_IDS.has(id)) {
      return NextResponse.json({ error: "env_only" }, { status: 400 });
    }

    const ref = adminDb.collection("integrations").doc(id);
    const snapshot = await ref.get();
    const catalog = INTEGRATION_CATALOG.find((item) => item.id === id);
    const existing = snapshot.exists
      ? (snapshot.data() as Record<string, unknown>)
      : {};
    const existingConfig =
      typeof existing.config === "object" && existing.config
        ? (existing.config as Record<string, string>)
        : {};

    const nextShell = stripUndefined({
      id,
      name: existing.name || catalog?.name || id,
      description: existing.description || catalog?.description || "",
      category: existing.category || catalog?.category || "",
      iconUrl: existing.iconUrl || catalog?.iconUrl || "",
      status: "not_connected" as const,
      connectedAt: null,
      // Replace config entirely (avoid Firestore nested merge keeping old keys).
      config: {
        category:
          existingConfig.category ||
          catalog?.category ||
          catalog?.config?.category ||
          "",
        ...(existingConfig.envOnly === "true" ||
        catalog?.config?.envOnly === "true"
          ? { envOnly: "true" }
          : {}),
        adminDisabled: "true",
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (snapshot.exists) {
      await ref.update(nextShell);
    } else {
      await ref.set(nextShell);
    }

    await adminDb.collection("integration_secrets").doc(id).delete().catch(() => null);

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "integration_disconnected",
      targetType: "integrations",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("integration_disconnect_failed", error);
    if (isQuotaError(error)) {
      return NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });
  }
}
