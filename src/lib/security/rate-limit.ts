import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Sliding fixed-window rate limit backed by Firestore (works across serverless instances).
 * Key format examples: `auth:login:ip:1.2.3.4`, `redeem:uid:abc`.
 */
export async function enforceRateLimit(options: {
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

  const result = await adminDb.runTransaction(async (tx) => {
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

  return result;
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
