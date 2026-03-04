"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH_VERSION = "v18.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type SendWhatsAppReplyResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type CreateAgencyTagResult =
  | { ok: true; message: string; tag: { id: string; name: string; color: string } }
  | { ok: false; error: string };

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (
    digits.startsWith("55") &&
    digits.length === 13
  ) {
    const ddd = parseInt(digits.slice(2, 4), 10);
    if (ddd >= 11 && ddd <= 28) {
      return digits.slice(0, 4) + digits.slice(5);
    }
  }
  return digits;
}

type AgencyWhatsAppConfig = {
  whatsapp_access_token: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_waba_id: string | null;
};

type ConvRow = { id: string; client_id: string; business_phone_id: string; lead_phone: string };
type ClientRow = { id: string; agency_id: string; metadata: unknown; whatsapp_business_phone_id: string | null };
type AgencyRow = AgencyWhatsAppConfig & { id: string };

export async function updateConversationTags(
  conversationId: string,
  tags: string[]
): Promise<UpdateConversationTagsResult> {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }

  const admin = createAdminClient();
  const { data: convData, error: convError } = await admin
    .from("whatsapp_conversations")
    .select("id, client_id")
    .eq("id", conversationId)
    .single();
  const conversation = convData as { id: string; client_id: string } | null;
  if (convError || !conversation) {
    return { ok: false, error: "Conversa não encontrada." };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  const { data: clientData } = await admin
    .from("clients")
    .select("id, agency_id")
    .eq("id", conversation.client_id)
    .single();
  const client = clientData as { id: string; agency_id: string } | null;

  if (!profile || !client || client.agency_id !== profile.agency_id) {
    return { ok: false, error: "Sem permissão para esta conversa." };
  }

  const { error: updateError } = await admin
    .from("whatsapp_conversations")
    .update({ tags } as never)
    .eq("id", conversationId);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }
  return { ok: true, message: "Tags atualizadas." };
}

export async function createAgencyTag(
  name: string,
  color: string
): Promise<CreateAgencyTagResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Nome da tag é obrigatório." };
  }

  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  const agencyId = profile?.agency_id;
  if (!agencyId) {
    return { ok: false, error: "Agência não encontrada." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agency_tags")
    .insert({ name: trimmed, color, agency_id: agencyId } as never)
    .select("id, name, color")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao criar tag." };
  }

  return { ok: true, message: "Tag criada.", tag: data as { id: string; name: string; color: string } };
}

export async function sendWhatsAppReply(
  conversationId: string,
  messageBody: string
): Promise<SendWhatsAppReplyResult> {
  const trimmed = messageBody?.trim();
  if (!trimmed) {
    return { ok: false, error: "Mensagem não pode estar vazia." };
  }

  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }

  const admin = createAdminClient();

  const { data: convData, error: convError } = await admin
    .from("whatsapp_conversations")
    .select("id, client_id, business_phone_id, lead_phone")
    .eq("id", conversationId)
    .single();
  const conversation = convData as ConvRow | null;

  if (convError || !conversation) {
    return { ok: false, error: "Conversa não encontrada." };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  const { data: clientData } = await admin
    .from("clients")
    .select("id, agency_id, metadata, whatsapp_business_phone_id")
    .eq("id", conversation.client_id)
    .single();
  const client = clientData as ClientRow | null;

  if (!profile || !client || client.agency_id !== profile.agency_id) {
    return { ok: false, error: "Sem permissão para esta conversa." };
  }

  const { data: agencyData } = await admin
    .from("agencies")
    .select("id, whatsapp_access_token, whatsapp_phone_number_id, whatsapp_waba_id")
    .eq("id", profile.agency_id)
    .single();
  const agency = agencyData as AgencyRow | null;

  const token = agency?.whatsapp_access_token ?? null;
  const sendPhoneId = agency?.whatsapp_phone_number_id ?? null;
  if (!token || !sendPhoneId) {
    return { ok: false, error: "Configure seu WhatsApp para enviar mensagens." };
  }

  const normalizedPhone = normalizePhoneNumber(conversation.lead_phone);
  // eslint-disable-next-line no-console
  console.log("Tentando enviar com ID:", sendPhoneId);
  // eslint-disable-next-line no-console
  console.log("Normalized Number:", normalizedPhone);
  // eslint-disable-next-line no-console
  console.warn(
    "[WA] Aviso: envio de texto sem template. Se o número estiver fora da janela de 24h, a Meta pode bloquear."
  );

  const url = `${GRAPH_BASE}/${sendPhoneId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "text",
    text: { body: trimmed },
  };
  // eslint-disable-next-line no-console
  console.log("Sending to Meta:", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number; error_subcode?: number };
  };
  // eslint-disable-next-line no-console
  console.log("Meta Response Raw:", json);

  if (!res.ok || json.error) {
    const errMsg =
      json.error?.message ??
      `HTTP ${res.status}: Falha ao enviar mensagem para a Meta.`;
    return {
      ok: false,
      error: errMsg,
    };
  }

  const waMessageId = json.messages?.[0]?.id ?? null;

  await admin.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    sender_type: "agent",
    message_body: trimmed,
    wa_message_id: waMessageId,
    status: "sent",
  } as never);

  await admin
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", conversationId);

  return { ok: true, message: "Mensagem enviada." };
}

export type SendWhatsAppMediaResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type UpdateConversationTagsResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type MediaType = "image" | "audio" | "document";

const BUCKET_CHAT_MEDIA = "chat-media";

export async function sendWhatsAppMedia(
  conversationId: string,
  formData: FormData
): Promise<SendWhatsAppMediaResult> {
  const file = formData.get("file") as File | null;
  const mediaType = (formData.get("mediaType") as MediaType) || "document";
  const caption = (formData.get("caption") as string)?.trim() || "";

  if (!file?.size) {
    return { ok: false, error: "Arquivo não enviado." };
  }
  if (!["image", "audio", "document"].includes(mediaType)) {
    return { ok: false, error: "Tipo de mídia inválido." };
  }

  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }

  const admin = createAdminClient();

  const { data: convData, error: convError } = await admin
    .from("whatsapp_conversations")
    .select("id, client_id, business_phone_id, lead_phone")
    .eq("id", conversationId)
    .single();
  const conversation = convData as ConvRow | null;

  if (convError || !conversation) {
    return { ok: false, error: "Conversa não encontrada." };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  const { data: clientData } = await admin
    .from("clients")
    .select("id, agency_id, metadata, whatsapp_business_phone_id")
    .eq("id", conversation.client_id)
    .single();
  const client = clientData as ClientRow | null;

  if (!profile || !client || client.agency_id !== profile.agency_id) {
    return { ok: false, error: "Sem permissão para esta conversa." };
  }

  const { data: agencyData } = await admin
    .from("agencies")
    .select("id, whatsapp_access_token, whatsapp_phone_number_id, whatsapp_waba_id")
    .eq("id", profile.agency_id)
    .single();
  const agency = agencyData as AgencyRow | null;

  const token = agency?.whatsapp_access_token ?? null;
  const sendPhoneId = agency?.whatsapp_phone_number_id ?? null;
  if (!token || !sendPhoneId) {
    return { ok: false, error: "Configure seu WhatsApp para enviar mensagens." };
  }

  const ext = file.name.split(".").pop() || (mediaType === "audio" ? "ogg" : "bin");
  const path = `${profile.agency_id}/${Date.now()}.${ext}`;
  const { data: up, error: upErr } = await admin.storage
    .from(BUCKET_CHAT_MEDIA)
    .upload(path, file, { upsert: true });
  if (upErr || !up?.path) {
    return { ok: false, error: upErr?.message ?? "Falha ao enviar arquivo." };
  }
  const { data: urlData } = admin.storage.from(BUCKET_CHAT_MEDIA).getPublicUrl(up.path);
  const mediaUrl = urlData?.publicUrl ?? "";

  const normalizedPhone = normalizePhoneNumber(conversation.lead_phone);
  console.log("Tentando enviar com ID:", sendPhoneId);
  // eslint-disable-next-line no-console
  console.warn(
    "[WA] Aviso: envio de mídia sem template. Se o número estiver fora da janela de 24h, a Meta pode bloquear."
  );

  const url = `${GRAPH_BASE}/${sendPhoneId}/messages`;

  const payloads: Record<MediaType, object> = {
    image: {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "image",
      image: { link: mediaUrl, ...(caption && { caption }) },
    },
    audio: {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "audio",
      audio: { link: mediaUrl },
    },
    document: {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "document",
      document: {
        link: mediaUrl,
        filename: file.name || `file.${ext}`,
        ...(caption && { caption }),
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloads[mediaType]),
  });

  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!res.ok || json.error) {
    return {
      ok: false,
      error: json.error?.message ?? `HTTP ${res.status}: Falha ao enviar mídia.`,
    };
  }

  const waMessageId = json.messages?.[0]?.id ?? null;
  const messageBody = caption || (mediaType === "image" ? "(imagem)" : mediaType === "audio" ? "(áudio)" : "(documento)");

  await admin.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    sender_type: "agent",
    message_body: messageBody,
    wa_message_id: waMessageId,
    status: "sent",
    media_url: mediaUrl,
    media_type: mediaType,
  } as never);

  await admin
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", conversationId);

  return { ok: true, message: "Mídia enviada." };
}
