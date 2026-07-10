import { NextResponse } from "next/server";
import { getTaxonomies } from "@/lib/collections/taxonomies";

export async function GET() {
  try {
    const taxonomies = await getTaxonomies();
    return NextResponse.json(taxonomies);
  } catch {
    return NextResponse.json({});
  }
}
