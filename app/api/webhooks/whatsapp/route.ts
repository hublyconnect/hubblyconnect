import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Configure WHATSAPP_VERIFY_TOKEN no .env em produção (usado na verificação do webhook pela Meta). */
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "hubly_wa_secret_2026";

type WebhookValue = {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: Array<{
    id?: string;
    from?: string;
    type?: string;
    text?: { body?: string };
    button?: { text?: string };
    image?: { id?: string; caption?: string };
    audio?: { id?: string };
    document?: { id?: string; filename?: string; caption?: string };
    referral?: {
      source_url?: string;
      source_type?: string;
      source_id?: string;
      ad_id?: string;
      ctwa_clid?: string;
    };
  }>;
  statuses?: Array<{
    id?: string;
    status?: string;
    recipient_id?: string;
    timestamp?: string;
  }>;
};

const BUCKET_CHAT_MEDIA = "chat-media";
const GRAPH_VERSION = "v18.0";

type WebhookMessage = NonNullable<WebhookValue["messages"]>[number];

type ClientRow = {
  id: string;
  agency_id: string;
  metadata?: Record<string, unknown>;
  whatsapp_business_phone_id?: string | null;
  whatsapp_waba_id?: string | null;
};

function extractAdId(referral: WebhookMessage["referral"]): string | null {
  if (!referral) return null;
  if (referral.ad_id) return referral.ad_id;
  if (referral.source_type === "ad" && referral.source_id) return referral.source_id;
  return null;
}

function getAccessToken(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const wa = metadata.whatsapp as Record<string, unknown> | undefined;
  if (wa?.access_token && typeof wa.access_token === "string") return wa.access_token;
  const fb = metadata.facebook_ads as Record<string, unknown> | undefined;
  if (fb?.access_token && typeof fb.access_token === "string") return fb.access_token;
  return process.env.WHATSAPP_ACCESS_TOKEN ?? null;
}

async function findClientByPhoneId(
  supabase: ReturnType<typeof createAdminClient>,
  wabaId: string
): Promise<ClientRow | null> {
  const { data: byWaba } = await supabase
    .from("clients")
    .select("id, agency_id, metadata, whatsapp_business_phone_id, whatsapp_waba_id")
    .eq("whatsapp_waba_id", wabaId)
    .limit(1)
    .maybeSingle();

  if (byWaba) return byWaba as ClientRow;

  const { data: byBusinessPhone } = await supabase
    .from("clients")
    .select("id, agency_id, metadata, whatsapp_business_phone_id, whatsapp_waba_id")
    .eq("whatsapp_business_phone_id", wabaId)
    .limit(1)
    .maybeSingle();

  return byBusinessPhone ? (byBusinessPhone as ClientRow) : null;
}

async function fetchAndUploadMedia(
  mediaId: string,
  token: string,
  agencyId: string,
  ext: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const metaJson = (await metaRes.json()) as { url?: string };
    const downloadUrl = metaJson?.url;
    if (!downloadUrl) return null;
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) return null;
    const buffer = await fileRes.arrayBuffer();
    const path = `${agencyId}/${Date.now()}.${ext}`;
    const { data: up, error } = await supabase.storage
      .from(BUCKET_CHAT_MEDIA)
      .upload(path, buffer, { upsert: true });
    if (error || !up?.path) return null;
    const { data: urlData } = supabase.storage.from(BUCKET_CHAT_MEDIA).getPublicUrl(up.path);
    return urlData?.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge") ?? "";

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(String(challenge), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const entries = Array.isArray(body?.entry) ? body.entry : [];
    const supabase = createAdminClient();

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value as WebhookValue | undefined;
        if (!value?.metadata?.phone_number_id) continue;

        const wabaId = value.metadata.phone_number_id;
        const contacts = value.contacts ?? [];
        const messages = value.messages ?? [];

        const client = await findClientByPhoneId(supabase, wabaId);
        if (!client?.id) {
          console.warn(
            `[WhatsApp Webhook] No client found for phone_id=${wabaId} (tried whatsapp_waba_id and whatsapp_business_phone_id)`
          );
          continue;
        }

        const clientId = client.id;
        const token = getAccessToken((client.metadata ?? {}) as Record<string, unknown>);
        const agencyId = client.agency_id;
        const sendPhoneId = client.whatsapp_business_phone_id ?? wabaId;

        for (const msg of messages) {
          const leadPhone = msg.from ?? contacts[0]?.wa_id ?? "";
          const leadName = contacts[0]?.profile?.name ?? null;
          let messageBody =
            msg.text?.body ?? (msg as { button?: { text?: string } }).button?.text ?? "";
          const waMessageId = msg.id ?? null;
          const referral = msg.referral;
          const adId = extractAdId(referral);
          let mediaUrl: string | null = null;
          let mediaType: string | null = null;

          if (msg.type === "image" && msg.image?.id) {
            mediaType = "image";
            messageBody = msg.image.caption ?? (messageBody || "(imagem)");
            if (token) {
              const ext = "jpg";
              mediaUrl = await fetchAndUploadMedia(msg.image.id, token, agencyId, ext, supabase);
            }
          } else if (msg.type === "audio" && msg.audio?.id) {
            mediaType = "audio";
            messageBody = "(áudio)";
            if (token) {
              mediaUrl = await fetchAndUploadMedia(msg.audio.id, token, agencyId, "ogg", supabase);
            }
          } else if (msg.type === "document" && msg.document?.id) {
            mediaType = "document";
            messageBody = (msg.document.caption ?? msg.document.filename) ?? "(documento)";
            if (token) {
              const ext = msg.document.filename?.split(".").pop() || "bin";
              mediaUrl = await fetchAndUploadMedia(msg.document.id, token, agencyId, ext, supabase);
            }
          }
          if (!messageBody) messageBody = "(mensagem)";

          if (!leadPhone) continue;

          const { data: existingConv } = await supabase
            .from("whatsapp_conversations")
            .select("id, ad_id")
            .eq("client_id", clientId)
            .eq("lead_phone", leadPhone)
            .maybeSingle();

          let conversationId: string;

          if (existingConv) {
            conversationId = existingConv.id;
            const updateData: { last_message_at: string; ad_id?: string } = {
              last_message_at: new Date().toISOString(),
            };
            if (adId && !existingConv.ad_id) updateData.ad_id = adId;
            await supabase
              .from("whatsapp_conversations")
              .update(updateData)
              .eq("id", conversationId);
          } else {
            const { data: newConv, error: insertConvErr } = await supabase
              .from("whatsapp_conversations")
              .insert({
                client_id: clientId,
                business_phone_id: sendPhoneId,
                lead_phone: leadPhone,
                lead_name: leadName,
                ad_id: adId,
                status: "open",
              })
              .select("id")
              .single();

            if (insertConvErr) {
              console.error("[WhatsApp Webhook] Failed to create conversation:", insertConvErr);
              continue;
            }
            conversationId = newConv.id;
          }

          await supabase.from("whatsapp_messages").insert({
            conversation_id: conversationId,
            sender_type: "lead",
            message_body: messageBody,
            wa_message_id: waMessageId,
            ...(mediaUrl && { media_url: mediaUrl }),
            ...(mediaType && { media_type: mediaType }),
          });
        }

        const statuses = value.statuses ?? [];
        for (const st of statuses) {
          const wamid = st.id?.trim();
          const newStatus = st.status?.toLowerCase();
          if (!wamid || !newStatus) continue;
          if (!["sent", "delivered", "read"].includes(newStatus)) continue;

          const { error: updateErr } = await supabase
            .from("whatsapp_messages")
            .update({ status: newStatus })
            .eq("wa_message_id", wamid);

          if (updateErr) {
            console.warn("[WhatsApp Webhook] Status update failed:", updateErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    return NextResponse.json({ success: false, error: "Processing failed" }, { status: 500 });
  }
}
