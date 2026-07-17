import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceLocationParts {
  placeId: string;
  formattedAddress: string;
  country: string;
  countryCode: string;
  city: string;
  town: string;
  region: string;
}

async function placesApiKey(): Promise<string | null> {
  const secrets = await getIntegrationSecrets("google_places");
  const key =
    secrets.apiKey?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    "";
  return key || null;
}

export async function isGooglePlacesLive(): Promise<boolean> {
  if (await isIntegrationConnected("google_places")) return true;
  return Boolean(await placesApiKey());
}

/** Places Autocomplete — global countries, cities, or towns. */
export async function autocompletePlaces(input: {
  query: string;
  type?: "country" | "city" | "town" | "address";
  countryCode?: string;
  sessionToken?: string;
}): Promise<PlacePrediction[]> {
  const key = await placesApiKey();
  if (!key) throw new Error("places_not_configured");

  const query = input.query.trim();
  if (query.length < 2) return [];

  const params = new URLSearchParams({
    input: query,
    key,
    language: "en",
  });

  if (input.type === "country") {
    params.set("types", "country");
  } else if (input.type === "city") {
    params.set("types", "(cities)");
  } else if (input.type === "town") {
    params.set("types", "geocode");
  } else {
    params.set("types", "geocode");
  }

  if (input.countryCode && /^[a-z]{2}$/i.test(input.countryCode)) {
    params.set("components", `country:${input.countryCode.toLowerCase()}`);
  }
  if (input.sessionToken) {
    params.set("sessiontoken", input.sessionToken);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
    { next: { revalidate: 0 } },
  );
  if (!response.ok) {
    throw new Error(`places_autocomplete_${response.status}`);
  }

  const payload = (await response.json()) as {
    status: string;
    error_message?: string;
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting?: {
        main_text?: string;
        secondary_text?: string;
      };
    }>;
  };

  if (payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    throw new Error(payload.error_message || `places_${payload.status}`);
  }

  return (payload.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? "",
  }));
}

function component(
  parts: Array<{ long_name: string; short_name: string; types: string[] }>,
  type: string,
  short = false,
): string {
  const match = parts.find((p) => p.types.includes(type));
  if (!match) return "";
  return short ? match.short_name : match.long_name;
}

/** Resolve country / city / town from a Place Details response. */
export async function getPlaceLocationParts(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceLocationParts | null> {
  const key = await placesApiKey();
  if (!key) throw new Error("places_not_configured");

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    language: "en",
    fields: "place_id,formatted_address,address_component,geometry",
  });
  if (sessionToken) params.set("sessiontoken", sessionToken);

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
    { next: { revalidate: 0 } },
  );
  if (!response.ok) {
    throw new Error(`places_details_${response.status}`);
  }

  const payload = (await response.json()) as {
    status: string;
    result?: {
      place_id: string;
      formatted_address?: string;
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    };
  };

  if (payload.status !== "OK" || !payload.result) {
    return null;
  }

  const parts = payload.result.address_components ?? [];
  const country = component(parts, "country");
  const countryCode = component(parts, "country", true);
  const city =
    component(parts, "locality") ||
    component(parts, "postal_town") ||
    component(parts, "administrative_area_level_2");
  const town =
    component(parts, "sublocality") ||
    component(parts, "sublocality_level_1") ||
    component(parts, "neighborhood") ||
    component(parts, "administrative_area_level_3") ||
    city;
  const region = component(parts, "administrative_area_level_1");

  return {
    placeId: payload.result.place_id,
    formattedAddress: payload.result.formatted_address ?? "",
    country,
    countryCode,
    city,
    town,
    region,
  };
}
