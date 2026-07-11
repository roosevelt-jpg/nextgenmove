import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/types/user";

export const IMPERSONATE_COOKIE_NAME = "__ngm_impersonate";

/** 1 hour — short-lived view-as session overlay. */
export const IMPERSONATE_EXPIRES_IN_MS = 60 * 60 * 1000;

export interface ImpersonationTokenPayload {
  actorUid: string;
  subjectUid: string;
  subjectRole: Extract<UserRole, "student" | "company">;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }

  return new TextEncoder().encode(secret);
}

export async function signImpersonationToken(
  payload: ImpersonationTokenPayload,
): Promise<string> {
  const expiresAtSec =
    Math.floor(Date.now() / 1000) +
    Math.floor(IMPERSONATE_EXPIRES_IN_MS / 1000);

  return new SignJWT({
    actorUid: payload.actorUid,
    subjectUid: payload.subjectUid,
    subjectRole: payload.subjectRole,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAtSec)
    .sign(getSessionSecret());
}

export async function verifyImpersonationToken(
  token: string,
): Promise<ImpersonationTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const actorUid = payload.actorUid;
    const subjectUid = payload.subjectUid;
    const subjectRole = payload.subjectRole;

    if (
      typeof actorUid !== "string" ||
      typeof subjectUid !== "string" ||
      (subjectRole !== "student" && subjectRole !== "company")
    ) {
      return null;
    }

    return { actorUid, subjectUid, subjectRole };
  } catch {
    return null;
  }
}
