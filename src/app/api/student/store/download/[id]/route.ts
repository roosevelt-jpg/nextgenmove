import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import {
  resolveStorageFileRef,
  resolveStorageObjectPath,
} from "@/lib/storage/file-ref";
import { resolveStorageBucketName } from "@/lib/storage/upload-via-admin";

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

    const contentSnapshot = await adminDb
      .collection("content_items")
      .doc(contentItemId)
      .get();

    if (!contentSnapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const contentData = contentSnapshot.data()!;
    const fileRef = resolveStorageFileRef(
      contentData.fileUrl ?? contentData.file,
    );
    const storagePath = fileRef ? resolveStorageObjectPath(fileRef) : null;

    if (!storagePath) {
      // Link-only purchases (video / external URL) — send the buyer to the link.
      const linkUrl =
        typeof contentData.linkUrl === "string"
          ? contentData.linkUrl.trim()
          : "";
      if (linkUrl) {
        return NextResponse.redirect(linkUrl);
      }
      return NextResponse.json({ error: "no_file" }, { status: 404 });
    }

    const bucket = adminStorage.bucket(await resolveStorageBucketName());
    const file = bucket.file(storagePath);
    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();

    const filename =
      fileRef?.filename ||
      (typeof metadata.metadata?.filename === "string"
        ? metadata.metadata.filename
        : storagePath.split("/").pop() ?? "download");

    const contentType =
      fileRef?.mimeType ||
      (typeof metadata.contentType === "string"
        ? metadata.contentType
        : "application/octet-stream");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("content_download_failed", error);
    return NextResponse.json({ error: "download_failed" }, { status: 500 });
  }
}
