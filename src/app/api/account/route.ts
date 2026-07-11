import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { syncLinkedProfile } from "@/lib/auth/profile-sync";
import { stripUndefined } from "@/lib/stripUndefined";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("users").doc(user.uid).get();
  const data = snap.data() ?? {};

  return NextResponse.json({
    account: {
      displayName: data.displayName ?? user.displayName ?? "",
      email: data.email ?? user.email ?? "",
      photoUrl: data.photoUrl ?? user.photoUrl ?? null,
      phone: data.phone ?? null,
      role: data.role ?? user.role,
      profileComplete: Boolean(data.profileComplete),
      notificationPreferences: data.notificationPreferences ?? {},
    },
  });
}

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.displayName !== undefined) updates.displayName = body.displayName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl;
    if (body.notificationPreferences !== undefined) {
      updates.notificationPreferences = body.notificationPreferences;
    }

    await adminDb.collection("users").doc(user.uid).update(stripUndefined(updates));

    if (body.newPassword) {
      await adminAuth.updateUser(user.uid, { password: body.newPassword });
      const { notifyPasswordChanged } = await import("@/lib/email/notify");
      void notifyPasswordChanged({ userId: user.uid, request });
    }

    await syncLinkedProfile({
      uid: user.uid,
      role: user.role,
      displayName: user.role === "student" ? body.displayName : undefined,
      contactName: user.role === "company" ? body.displayName : undefined,
      photoUrl: body.photoUrl,
      phone: body.phone,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
