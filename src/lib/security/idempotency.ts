import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

export function readIdempotencyKey(request: Request): string | null {
  const header =
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key");
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  return trimmed;
}

function docIdFor(scope: string, actorId: string, key: string): string {
  return createHash("sha256")
    .update(`${scope}:${actorId}:${key}`)
    .digest("hex")
    .slice(0, 40);
}

export async function getIdempotentResult<T>(options: {
  scope: string;
  actorId: string;
  key: string;
}): Promise<T | null> {
  const id = docIdFor(options.scope, options.actorId, options.key);
  const snap = await adminDb.collection("idempotency_keys").doc(id).get();
  if (!snap.exists) return null;
  return (snap.data()?.response as T | undefined) ?? null;
}

export async function saveIdempotentResult<T>(options: {
  scope: string;
  actorId: string;
  key: string;
  response: T;
  status: number;
}): Promise<void> {
  const id = docIdFor(options.scope, options.actorId, options.key);
  await adminDb
    .collection("idempotency_keys")
    .doc(id)
    .set(
      stripUndefined({
        id,
        scope: options.scope,
        actorId: options.actorId,
        key: options.key,
        status: options.status,
        response: options.response,
        createdAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
}
