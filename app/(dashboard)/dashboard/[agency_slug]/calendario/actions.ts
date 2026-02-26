"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createGoogleCalendarEvent } from "@/lib/calendar-actions";

export type EventType = "meeting" | "recording" | "call" | "onboarding" | "daily" | "review";

export type CreateEventResult = { ok: true; id: string } | { ok: false; error: string };

const DEFAULT_DURATION_MINUTES = 60;

export async function createCalendarEventAction(
  agencySlug: string,
  formData: FormData
): Promise<CreateEventResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id").eq("id", user.id).single();
  if (!profile?.agency_id) return { ok: false, error: "Sem permissão." };

  const title = (formData.get("title") as string)?.trim();
  const event_type = (formData.get("event_type") as EventType) || "meeting";
  const event_color = (formData.get("event_color") as string)?.trim() || null;
  const starts_at = formData.get("starts_at") as string;
  const client_id = (formData.get("client_id") as string)?.trim() || null;
  const meeting_url = (formData.get("meeting_url") as string)?.trim() || null;
  const duration_minutes = formData.get("duration_minutes") ? parseInt(String(formData.get("duration_minutes")), 10) : DEFAULT_DURATION_MINUTES;
  if (!title || !starts_at) return { ok: false, error: "Título e data/hora são obrigatórios." };

  const starts = new Date(starts_at);
  const durationMs = (Number.isNaN(duration_minutes) ? DEFAULT_DURATION_MINUTES : duration_minutes) * 60 * 1000;
  const ends = new Date(starts.getTime() + durationMs);

  const startISO = starts.toISOString();
  const payload: Record<string, unknown> = {
    agency_id: profile.agency_id,
    title,
    event_type,
    start_time: startISO,
    starts_at: startISO,
    end_time: ends.toISOString(),
    event_color: event_color || null,
    client_id: client_id || null,
    meeting_url: meeting_url || null,
    duration_minutes: Number.isNaN(duration_minutes) ? DEFAULT_DURATION_MINUTES : duration_minutes,
    whatsapp_status: "pending",
  };
  const { data: row, error } = await supabase
    .from("calendar_events")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const googleResult = await createGoogleCalendarEvent(
    title,
    startISO,
    ends.toISOString()
  );
  if (googleResult.ok) {
    await supabase
      .from("calendar_events")
      .update({ google_event_id: googleResult.googleEventId })
      .eq("id", row.id);
  }

  revalidatePath(`/dashboard/${agencySlug}/calendario`);
  return { ok: true, id: row.id };
}

export type CreateOnboardingEventResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Cria evento de onboarding no calendário (DB + Google Calendar se configurado).
 * Título: [Onboarding] {clientName}: {taskTitle}
 */
export async function createOnboardingCalendarEventAction(
  agencySlug: string,
  clientId: string,
  clientName: string,
  taskTitle: string,
  startsAtISO: string
): Promise<CreateOnboardingEventResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id").eq("id", user.id).single();
  if (!profile?.agency_id) return { ok: false, error: "Sem permissão." };

  const starts = new Date(startsAtISO);
  const ends = new Date(starts.getTime() + 60 * 60 * 1000);
  const title = `[Onboarding] ${clientName}: ${taskTitle}`;
  const startISO = starts.toISOString();

  const { data: row, error } = await supabase
    .from("calendar_events")
    .insert({
      agency_id: profile.agency_id,
      client_id: clientId,
      title,
      event_type: "meeting",
      start_time: startISO,
      starts_at: startISO,
      end_time: ends.toISOString(),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const googleResult = await createGoogleCalendarEvent(
    title,
    starts.toISOString(),
    ends.toISOString()
  );
  if (googleResult.ok) {
    await supabase
      .from("calendar_events")
      .update({ google_event_id: googleResult.googleEventId })
      .eq("id", row.id);
  }

  revalidatePath(`/dashboard/${agencySlug}/calendario`);
  return { ok: true, id: row.id };
}

export type UpdateCalendarEventResult = { ok: true } | { ok: false; error: string };

/**
 * Atualiza um evento existente (título, tipo, cor, cliente, data/hora, duração, link).
 */
export async function updateCalendarEventAction(
  agencySlug: string,
  eventId: string,
  formData: FormData
): Promise<UpdateCalendarEventResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id").eq("id", user.id).single();
  if (!profile?.agency_id) return { ok: false, error: "Sem permissão." };

  const title = (formData.get("title") as string)?.trim();
  const event_type = (formData.get("event_type") as EventType) || "meeting";
  const event_color = (formData.get("event_color") as string)?.trim() || null;
  const starts_at = formData.get("starts_at") as string;
  const client_id = (formData.get("client_id") as string)?.trim() || null;
  const meeting_url = (formData.get("meeting_url") as string)?.trim() || null;
  const duration_minutes = formData.get("duration_minutes") ? parseInt(String(formData.get("duration_minutes")), 10) : DEFAULT_DURATION_MINUTES;
  if (!title || !starts_at) return { ok: false, error: "Título e data/hora são obrigatórios." };

  const starts = new Date(starts_at);
  const durationMs = (Number.isNaN(duration_minutes) ? DEFAULT_DURATION_MINUTES : duration_minutes) * 60 * 1000;
  const ends = new Date(starts.getTime() + durationMs);
  const startISO = starts.toISOString();

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title,
      event_type,
      event_color: event_color || null,
      client_id: client_id || null,
      meeting_url: meeting_url || null,
      duration_minutes: Number.isNaN(duration_minutes) ? DEFAULT_DURATION_MINUTES : duration_minutes,
      start_time: startISO,
      starts_at: startISO,
      end_time: ends.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("agency_id", profile.agency_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/${agencySlug}/calendario`);
  return { ok: true };
}

export type UpdateEventDateResult = { ok: true } | { ok: false; error: string };

/**
 * Atualiza a data/hora de um evento (ex.: quando movido no calendário).
 * Se calendar_events tiver asset_id e creative_assets tiver due_date, atualiza também a previsão do criativo.
 */
export async function updateCalendarEventStartsAtAction(
  agencySlug: string,
  eventId: string,
  newStartsAtISO: string
): Promise<UpdateEventDateResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id").eq("id", user.id).single();
  if (!profile?.agency_id) return { ok: false, error: "Sem permissão." };

  const starts = new Date(newStartsAtISO);
  const ends = new Date(starts.getTime() + 60 * 60 * 1000);
  const startISO = starts.toISOString();

  const { error } = await supabase
    .from("calendar_events")
    .update({
      start_time: startISO,
      starts_at: startISO,
      end_time: ends.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("agency_id", profile.agency_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/${agencySlug}/calendario`);
  return { ok: true };
}

export type DeleteCalendarEventResult = { ok: true } | { ok: false; error: string };

export async function deleteCalendarEventAction(
  agencySlug: string,
  eventId: string
): Promise<DeleteCalendarEventResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id").eq("id", user.id).single();
  if (!profile?.agency_id) return { ok: false, error: "Sem permissão." };

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("agency_id", profile.agency_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/${agencySlug}/calendario`);
  return { ok: true };
}
