import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/types/user";
import { SESSION_EXPIRES_IN_MS } from "./constants";

interface RoleTokenPayload {
  uid: string;
  role: UserRole;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }

  return new TextEncoder().encode(secret);
}

export async function signRoleToken(payload: RoleTokenPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRES_IN_MS}ms`)
    .sign(getSessionSecret());
}

export async function verifyRoleToken(
  token: string,
): Promise<RoleTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const uid = payload.uid;
    const role = payload.role;

    if (typeof uid !== "string" || typeof role !== "string") {
      return null;
    }

    if (role !== "admin" && role !== "company" && role !== "student") {
      return null;
    }

    return { uid, role };
  } catch {
    return null;
  }
}
