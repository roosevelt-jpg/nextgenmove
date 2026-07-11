import { NextResponse } from "next/server";

export type PortalSessionMode = "live" | "preview" | "impersonation";

export function previewReadonlyResponse() {
  return NextResponse.json({ error: "preview_readonly" }, { status: 403 });
}

export function assertNotPreviewMode(mode: PortalSessionMode): NextResponse | null {
  if (mode === "preview") {
    return previewReadonlyResponse();
  }
  return null;
}
