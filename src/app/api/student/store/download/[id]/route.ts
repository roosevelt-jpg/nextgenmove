import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";

function storagePathFromDownloadUrl(url: string): string | null {
  try {
    if (url.startsWith("gs://")) {
      const withoutScheme = url.slice("gs://".length);
      const slashIndex = withoutScheme.indexOf("/");
      return slashIndex >= 0 ? withoutScheme.slice(slashIndex + 1) : null;
    }

    const parsed = new URL(url);
    const objectMatch = parsed.pathname.match(/\/o\/(.+)$/);

    if (!objectMatch?.[1]) {
      return null;
    }

    return decodeURIComponent(objectMatch[1]);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { id: contentItemId } = await context.params;

  try {
    const purchaseSnapshot = await adminDb
      .collection("content_purchases")
      .where("studentId", "==", session.studentId)
      .where("contentItemId", "==", contentItemId)
      .limit(1)
      .get();

    if (purchaseSnapshot.empty) {
      return NextResponse.json({ error: "not_purchased" }, { status: 403 });
    }

    const contentSnapshot = await adminDb.collection("content_items").doc(contentItemId).get();

    if (!contentSnapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const contentData = contentSnapshot.data()!;
    const fileUrl = contentData.fileUrl as string | undefined;

    if (!fileUrl) {
      return NextResponse.json({ error: "no_file" }, { status: 404 });
    }

    const storagePath = storagePathFromDownloadUrl(fileUrl);

    if (!storagePath) {
      return NextResponse.json({ error: "invalid_file_reference" }, { status: 500 });
    }

    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();

    const filename =
      typeof metadata.metadata?.filename === "string"
        ? metadata.metadata.filename
        : storagePath.split("/").pop() ?? "download";

    const contentType =
      typeof metadata.contentType === "string"
        ? metadata.contentType
        : "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("content_download_failed", error);
    return NextResponse.json({ error: "download_failed" }, { status: 500 });
  }
}
