import { adminAuth } from "@/lib/firebase-admin";
import { logger } from "@/lib/observability/logger";

/**
 * Immediately invalidate Firebase refresh tokens / session cookies for a user.
 * Pair with verifySessionCookie(..., checkRevoked: true) which we already use.
 */
export async function revokeUserSessions(uid: string, reason: string): Promise<void> {
  try {
    await adminAuth.revokeRefreshTokens(uid);
    logger.info("sessions_revoked", { userId: uid, reason });
  } catch (error) {
    logger.error("sessions_revoke_failed", {
      userId: uid,
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
