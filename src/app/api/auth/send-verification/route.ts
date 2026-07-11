import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { appBaseUrl } from "@/lib/billing/stripe";
import { notifyEmailVerification } from "@/lib/email/notify";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const base = appBaseUrl(request);
    const verifyUrl = await adminAuth.generateEmailVerificationLink(user.email, {
      url: `${base}/sign-in`,
      handleCodeInApp: false,
    });

    await notifyEmailVerification({
      userId: user.uid,
      verifyUrl,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "verification_failed" }, { status: 500 });
  }
}
