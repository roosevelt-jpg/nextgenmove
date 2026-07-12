import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { storeIntegrationSecret } from "@/lib/admin/integration-secrets";
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
    const body = connectSchema.parse(await request.json());
    const ref = adminDb.collection("integrations").doc(id);
    let existing: Record<string, unknown> = {};

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

    if (body.secrets && Object.keys(body.secrets).length > 0) {
      await storeIntegrationSecret(id, body.secrets);
    }

    // Upsert shell if missing so Connect never 404s on a fresh project.
    await ref.set(
      stripUndefined({
        id,
        name: existing.name || id,
        description: existing.description || "",
        category: existing.category || body.config?.category || "",
        iconUrl: existing.iconUrl || "",
        status: "connected",
        connectedAt: FieldValue.serverTimestamp(),
        config: {
          ...(typeof existing.config === "object" && existing.config
            ? existing.config
            : {}),
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
    const ref = adminDb.collection("integrations").doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await ref.update(
      stripUndefined({
        status: "not_connected",
        connectedAt: null,
        config: {},
      }),
    );

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
