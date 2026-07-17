import { NextResponse } from "next/server";
import { z } from "zod";
import {
  autocompletePlaces,
  getPlaceLocationParts,
  isGooglePlacesLive,
} from "@/lib/maps/google-places";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const autocompleteSchema = z.object({
  query: z.string().trim().min(1).max(120),
  type: z.enum(["country", "city", "town", "address"]).optional(),
  countryCode: z.string().trim().max(2).optional(),
  sessionToken: z.string().trim().max(64).optional(),
});

const detailsSchema = z.object({
  placeId: z.string().trim().min(3).max(256),
  sessionToken: z.string().trim().max(64).optional(),
});

export async function GET(request: Request) {
  const ip = clientIpFromRequest(request);
  const limited = await enforceRateLimit({
    key: `places:${ip}`,
    limit: 60,
    windowSec: 60,
  });
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  const live = await isGooglePlacesLive();
  if (!live) {
    return NextResponse.json(
      { error: "places_not_configured", enabled: false },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "autocomplete";

  try {
    if (action === "details") {
      const parsed = detailsSchema.parse({
        placeId: searchParams.get("placeId") ?? "",
        sessionToken: searchParams.get("sessionToken") ?? undefined,
      });
      const place = await getPlaceLocationParts(
        parsed.placeId,
        parsed.sessionToken,
      );
      if (!place) {
        return NextResponse.json({ error: "place_not_found" }, { status: 404 });
      }
      return NextResponse.json({ place, enabled: true });
    }

    const parsed = autocompleteSchema.parse({
      query: searchParams.get("query") ?? "",
      type: searchParams.get("type") ?? undefined,
      countryCode: searchParams.get("countryCode") ?? undefined,
      sessionToken: searchParams.get("sessionToken") ?? undefined,
    });

    const predictions = await autocompletePlaces(parsed);
    return NextResponse.json({ predictions, enabled: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "places_failed";
    console.error("places_api_failed", message);
    return NextResponse.json(
      { error: message === "places_not_configured" ? message : "places_failed" },
      { status: message === "places_not_configured" ? 503 : 500 },
    );
  }
}
