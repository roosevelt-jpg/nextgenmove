import { getIntegrationSecrets } from "@/lib/admin/integration-secrets";

interface CalendarEventInput {
  summary: string;
  description?: string;
  startIso: string;
  endIso?: string;
  attendeeEmails?: string[];
  timeZone?: string;
}

interface CalendarEventResult {
  eventId: string;
  htmlLink: string | null;
}

async function getAccessToken(): Promise<{
  accessToken: string;
  calendarId: string;
} | null> {
  const secrets = await getIntegrationSecrets("google_calendar");
  const clientId = secrets.clientId?.trim();
  const clientSecret = secrets.clientSecret?.trim();
  const refreshToken = secrets.refreshToken?.trim();
  const calendarId = secrets.calendarId?.trim() || "primary";

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("google_calendar_token_failed", response.status, text.slice(0, 300));
    return null;
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) return null;

  return { accessToken: payload.access_token, calendarId };
}

/**
 * Creates a Google Calendar event when the integration has OAuth + refresh token.
 * Returns null when Calendar is not connected or the API call fails (non-blocking).
 */
export async function createInterviewCalendarEvent(
  input: CalendarEventInput,
): Promise<CalendarEventResult | null> {
  const auth = await getAccessToken();
  if (!auth) return null;

  const start = new Date(input.startIso);
  if (Number.isNaN(start.getTime())) return null;

  const end = input.endIso
    ? new Date(input.endIso)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const timeZone = input.timeZone || "UTC";
  const attendees = (input.attendeeEmails ?? [])
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"))
    .map((email) => ({ email }));

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description ?? "",
        start: { dateTime: start.toISOString(), timeZone },
        end: { dateTime: end.toISOString(), timeZone },
        ...(attendees.length ? { attendees } : {}),
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("google_calendar_create_failed", response.status, text.slice(0, 400));
    return null;
  }

  const payload = (await response.json()) as {
    id?: string;
    htmlLink?: string;
  };

  if (!payload.id) return null;

  return {
    eventId: payload.id,
    htmlLink: payload.htmlLink ?? null,
  };
}

export async function isGoogleCalendarReady(): Promise<boolean> {
  const secrets = await getIntegrationSecrets("google_calendar");
  return Boolean(
    secrets.clientId?.trim() &&
      secrets.clientSecret?.trim() &&
      secrets.refreshToken?.trim(),
  );
}
