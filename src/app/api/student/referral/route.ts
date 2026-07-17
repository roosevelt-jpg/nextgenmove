import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyReferralCode,
  ensureStudentReferralCode,
} from "@/lib/credits/referrals";
import { getWayToEarnCredits } from "@/lib/credits/ledger";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  try {
    const referralCode = await ensureStudentReferralCode(session.studentId);
    const bonusCredits = await getWayToEarnCredits("referral");

    return NextResponse.json({
      referralCode,
      bonusCredits,
      referredBy: session.student.referredBy ?? null,
    });
  } catch (error) {
    console.error("referral_get_failed", error);
    return NextResponse.json({ error: "referral_unavailable" }, { status: 500 });
  }
}

const applySchema = z.object({
  code: z.string().trim().min(4).max(24),
});

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const body = applySchema.parse(await request.json());
    const result = await applyReferralCode({
      studentId: session.studentId,
      code: body.code,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    console.error("referral_apply_failed", error);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
}
