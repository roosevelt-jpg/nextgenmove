import { NextResponse } from "next/server";
import { hasActivePaidPlan } from "@/lib/access/paid-plan";
import { getPortalVideoLibrary } from "@/lib/collections/pages";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  if (
    !hasActivePaidPlan({
      plan: session.student.plan,
      subscriptionStatus: session.student.subscriptionStatus,
    })
  ) {
    return NextResponse.json({ access: "locked" as const, videos: [] });
  }

  const videos = await getPortalVideoLibrary();
  return NextResponse.json({
    access: "granted" as const,
    videos: videos.map((video) => ({
      id: video.id,
      title: video.title,
      subtitle: video.subtitle,
      videoUrl: video.videoUrl,
      duration: video.duration,
      thumbnailUrl: video.thumbnailUrl,
    })),
  });
}
