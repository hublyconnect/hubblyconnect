"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH_VERSION = "v18.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type SendWhatsAppReplyResult =
  | { ok: true; message: string }
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

function getWhatsAppAccessToken(
  metadata: Record<string, unknown> | null
): string | null {
  if (!metadata) return null;
  const whatsapp = metadata.whatsapp as Record<string, unknown> | undefined;
  if (whatsapp?.access_token && typeof whatsapp.access_token === "string") {
    return whatsapp.access_token;
  }
  const facebookAds = metadata.facebook_ads as Record<string, unknown> | undefined;
  if (facebookAds?.access_token && typeof facebookAds.access_token === "string") {
    return facebookAds.access_token;
  }
  return process.env.WHATSAPP_ACCESS_TOKEN ?? null;
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

  const { data: conversation, error: convError } = await admin
    .from("whatsapp_conversations")
    .select("id, client_id, business_phone_id, lead_phone")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    return { ok: false, error: "Conversa não encontrada." };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  const { data: client } = await admin
    .from("clients")
    .select("id, agency_id, metadata, whatsapp_business_phone_id")
    .eq("id", conversation.client_id)
    .single();

  if (!profile || !client || client.agency_id !== profile.agency_id) {
    return { ok: false, error: "Sem permissão para esta conversa." };
  }

  const token = getWhatsAppAccessToken(
    (client.metadata ?? {}) as Record<string, unknown>
  );
  if (!token) {
    return { ok: false, error: "WhatsApp não conectado para este cliente." };
  }

  const sendPhoneId = client.whatsapp_business_phone_id ?? conversation.business_phone_id;
  if (!sendPhoneId) {
    return { ok: false, error: "WhatsApp Business Phone ID não configurado para este cliente." };
  }

  const normalizedPhone = normalizePhoneNumber(conversation.lead_phone);
  // eslint-disable-next-line no-console
  console.log("SENDING WITH ID:", sendPhoneId);
  // eslint-disable-next-line no-console
  console.log("Normalized Number:", normalizedPhone);

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
  });

  await admin
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { ok: true, message: "Mensagem enviada." };
}

export type SendWhatsAppMediaResult =
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

  const { data: conversation, error: convError } = await admin
    .from("whatsapp_conversations")
    .select("id, client_id, business_phone_id, lead_phone")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    return { ok: false, error: "Conversa não encontrada." };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  const { data: client } = await admin
    .from("clients")
    .select("id, agency_id, metadata, whatsapp_business_phone_id")
    .eq("id", conversation.client_id)
    .single();

  if (!profile || !client || client.agency_id !== profile.agency_id) {
    return { ok: false, error: "Sem permissão para esta conversa." };
  }

  const sendPhoneId = client.whatsapp_business_phone_id ?? conversation.business_phone_id;
  if (!sendPhoneId) {
    return { ok: false, error: "WhatsApp Business Phone ID não configurado para este cliente." };
  }

  const token = getWhatsAppAccessToken(
    (client.metadata ?? {}) as Record<string, unknown>
  );
  if (!token) {
    return { ok: false, error: "WhatsApp não conectado para este cliente." };
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
  console.log("SENDING WITH ID:", sendPhoneId);

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
  });

  await admin
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { ok: true, message: "Mídia enviada." };
}
