import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Don't let Firestore quota/outages hang auth and payments forever. */
const RATE_LIMIT_TIMEOUT_MS = 2500;

/**
 * Sliding fixed-window rate limit backed by Firestore (works across serverless instances).
 * Key format examples: `auth:login:ip:1.2.3.4`, `redeem:uid:abc`.
 *
 * Fail-open: if Firestore is slow/unavailable, allow the request so sign-in
 * and other critical paths are not stuck during quota exhaustion.
 */
export async function enforceRateLimit(options: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  try {
    // Guard the Firestore transaction so a late RESOURCE_EXHAUSTED reject
    // after we already fail-open cannot crash the isolate.
    const firestoreAttempt = enforceRateLimitFirestore(options).then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const }),
    );

    const raced = await Promise.race([
      firestoreAttempt,
      new Promise<{ ok: false }>((resolve) => {
        setTimeout(() => resolve({ ok: false }), RATE_LIMIT_TIMEOUT_MS);
      }),
    ]);

    if (raced.ok) {
      return raced.value;
    }

    return {
      allowed: true,
      remaining: options.limit,
      retryAfterSec: 0,
    };
  } catch {
    return {
      allowed: true,
      remaining: options.limit,
      retryAfterSec: 0,
    };
  }
}

async function enforceRateLimitFirestore(options: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / (options.windowSec * 1000));
  const docId = createHash("sha256")
    .update(`${options.key}:${bucket}`)
    .digest("hex")
    .slice(0, 40);
  const ref = adminDb.collection("rate_limits").doc(docId);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.data()?.count as number | undefined) ?? 0;

    if (count >= options.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: options.windowSec,
      };
    }

    tx.set(
      ref,
      stripUndefined({
        id: docId,
        key: options.key,
        bucket,
        count: count + 1,
        expiresAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - count - 1),
      retryAfterSec: options.windowSec,
    };
  });
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(retryAfterSec: number) {
  return Response.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
