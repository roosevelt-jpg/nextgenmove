import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { withTimeout } from "@/lib/async/with-timeout";
import { syncLinkedProfile } from "@/lib/auth/profile-sync";
import { stripUndefined } from "@/lib/stripUndefined";
import { optionalNullableUrl } from "@/lib/validation/fields";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const snap = await withTimeout(
      adminDb.collection("users").doc(user.uid).get(),
      5000,
      "account_lookup",
    );
    const data = snap.data() ?? {};

    return NextResponse.json({
      account: {
        displayName: data.displayName ?? user.displayName ?? "",
        email: data.email ?? user.email ?? "",
        photoUrl: data.photoUrl ?? user.photoUrl ?? null,
        phone: data.phone ?? null,
        preferredLocale: data.preferredLocale ?? null,
        role: data.role ?? user.role,
        profileComplete: Boolean(data.profileComplete),
        notificationPreferences: data.notificationPreferences ?? {},
      },
    });
  } catch (error) {
    console.error("account_get_degraded", error);
    // Session is valid — return actor fields so My account is not blank.
    return NextResponse.json({
      account: {
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        photoUrl: user.photoUrl ?? null,
        phone: null,
        preferredLocale: null,
        role: user.role,
        profileComplete: false,
        notificationPreferences: {},
      },
      warning: "account_degraded",
    });
  }
}

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  preferredLocale: z.string().trim().min(2).max(16).nullable().optional(),
  photoUrl: optionalNullableUrl,
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
});

/** Verify email/password via Identity Toolkit before allowing password change. */
async function verifyCurrentPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !email) return false;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: false,
      }),
    },
  );
  return response.ok;
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());

    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "current_password_required" },
          { status: 400 },
        );
      }
      const email = user.email ?? "";
      const valid = await verifyCurrentPassword(email, body.currentPassword);
      if (!valid) {
        return NextResponse.json(
          { error: "invalid_current_password" },
          { status: 400 },
        );
      }
    }

    const updates: Record<string, unknown> = {
      email: user.email ?? null,
      role: user.role,
    };

    if (body.displayName !== undefined) updates.displayName = body.displayName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.preferredLocale !== undefined) {
      updates.preferredLocale = body.preferredLocale;
    }
    if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl;
    if (body.notificationPreferences !== undefined) {
      updates.notificationPreferences = body.notificationPreferences;
    }

    await adminDb
      .collection("users")
      .doc(user.uid)
      .set(
        {
          ...stripUndefined(updates),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    if (body.newPassword) {
      await adminAuth.updateUser(user.uid, { password: body.newPassword });
      const { notifyPasswordChanged } = await import("@/lib/email/notify");
      void notifyPasswordChanged({ userId: user.uid, request });
    }

    if (body.photoUrl !== undefined || body.displayName !== undefined) {
      try {
        await adminAuth.updateUser(user.uid, {
          ...(body.displayName !== undefined
            ? { displayName: body.displayName }
            : {}),
          ...(body.photoUrl !== undefined
            ? { photoURL: body.photoUrl || undefined }
            : {}),
        });
      } catch (authError) {
        console.error("account_auth_profile_sync_failed", authError);
      }
    }

    await syncLinkedProfile({
      uid: user.uid,
      role: user.role,
      displayName: user.role === "student" ? body.displayName : undefined,
      contactName: user.role === "company" ? body.displayName : undefined,
      photoUrl: body.photoUrl,
      phone: body.phone,
    });

    return NextResponse.json({
      ok: true,
      photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("account_patch_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
