"use server";

/**
 * Integração com Google Calendar API.
 * Variáveis de ambiente (opcionais):
 * - GOOGLE_CALENDAR_CLIENT_ID
 * - GOOGLE_CALENDAR_CLIENT_SECRET
 * - GOOGLE_CALENDAR_REFRESH_TOKEN
 * - GOOGLE_CALENDAR_ID (ex: "primary" ou id do calendário)
 * Se não configuradas, createGoogleCalendarEvent retorna ok: false com mensagem amigável.
 */

export type CreateGoogleCalendarEventResult =
  | { ok: true; googleEventId: string }
  | { ok: false; error: string };

async function getGoogleAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/**
 * Cria um evento no Google Calendar.
 * @param title - Título do evento
 * @param startISO - Data/hora início (ISO 8601)
 * @param endISO - Data/hora fim (ISO 8601)
 */
export async function createGoogleCalendarEvent(
  title: string,
  startISO: string,
  endISO: string
): Promise<CreateGoogleCalendarEventResult> {
  const calendarId =
    process.env.GOOGLE_CALENDAR_ID ?? "primary";
  const token = await getGoogleAccessToken();
  if (!token) {
    return {
      ok: false,
      error: "Google Calendar não configurado. Defina GOOGLE_CALENDAR_* nas variáveis de ambiente.",
    };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        start: { dateTime: startISO, timeZone: "America/Sao_Paulo" },
        end: { dateTime: endISO, timeZone: "America/Sao_Paulo" },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json()).error as { message?: string } | undefined;
    return {
      ok: false,
      error: err?.message ?? `Google Calendar API: ${res.status}`,
    };
  }

  const event = (await res.json()) as { id?: string };
  const googleEventId = event.id;
  if (!googleEventId) {
    return { ok: false, error: "Resposta da API sem id do evento." };
  }
  return { ok: true, googleEventId };
}
