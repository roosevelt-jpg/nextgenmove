import { NextResponse } from "next/server";
import { getTaxonomies } from "@/lib/collections/taxonomies";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import { ENTITY_SCHEMAS } from "@/lib/admin/entity-schemas";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const taxonomies = await getTaxonomies();

  return NextResponse.json({
    schemas: ENTITY_SCHEMAS,
    taxonomies,
  });
}
