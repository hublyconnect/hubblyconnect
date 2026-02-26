import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Token que definimos para a Meta
  const VERIFY_TOKEN = "hubly_wa_secret_2026";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(String(challenge ?? ""), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json().catch(() => null);

    const entry = Array.isArray(body?.entry) ? body.entry[0] : null;
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];

    console.log("[WA Webhook] Payload recebido:", {
      hasEntry: Boolean(entry),
      hasChange: Boolean(change),
      hasValue: Boolean(value),
      hasMessage: Boolean(msg),
      messageId: msg?.id,
      messageType: msg?.type,
      phoneNumberId: value?.metadata?.phone_number_id,
    });

    if (!value || !msg) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const businessPhoneId = String(value?.metadata?.phone_number_id ?? "");
    const leadPhone = String(value?.contacts?.[0]?.wa_id ?? msg?.from ?? "");
    const leadName = value?.contacts?.[0]?.profile?.name ?? null;
    const messageBody = msg?.text?.body ?? "";
    const waMessageId = msg?.id ?? null;
    const adId = msg?.referral?.ad_id ?? null;
    const campaignId = msg?.referral?.campaign_id ?? msg?.referral?.source_id ?? null;

    console.log("[WA Webhook] Dados extraídos:", {
      businessPhoneId,
      leadPhone,
      leadName,
      waMessageId,
      adId,
      campaignId,
      messagePreview: messageBody?.slice?.(0, 80),
    });

    if (!businessPhoneId || !leadPhone) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const { data: clientsByWaba, error: wabaError } = await supabase
      .from("clients")
      .select("id, whatsapp_business_phone_id")
      .eq("whatsapp_waba_id", businessPhoneId)
      .limit(1);
    if (wabaError) {
      console.warn("[WA Webhook] Erro ao buscar cliente por WABA:", wabaError.message);
    }
    let client = (clientsByWaba?.[0] as unknown as { id: string; whatsapp_business_phone_id?: string | null }) ?? null;

    if (!client) {
      const { data: clientsByPhone, error: phoneError } = await supabase
        .from("clients")
        .select("id, whatsapp_business_phone_id")
        .eq("whatsapp_business_phone_id", businessPhoneId)
        .limit(1);
      if (phoneError) {
        console.warn("[WA Webhook] Erro ao buscar cliente por phone ID:", phoneError.message);
      }
      client = (clientsByPhone?.[0] as unknown as { id: string; whatsapp_business_phone_id?: string | null }) ?? null;
    }

    if (!client?.id) {
      console.warn("[WA Webhook] Cliente não encontrado para o ID informado.");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const now = new Date().toISOString();
    const { data: existingConv, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("client_id", client.id)
      .eq("lead_phone", leadPhone)
      .maybeSingle();
    if (convError) {
      console.warn("[WA Webhook] Erro ao buscar conversa:", convError.message);
    }

    const existingConversation = (existingConv as { id: string } | null) ?? null;
    let conversationId = existingConversation?.id ?? null;
    if (!conversationId) {
      const { data: createdConv, error: createError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          client_id: client.id,
          business_phone_id: client.whatsapp_business_phone_id ?? businessPhoneId,
          lead_phone: leadPhone,
          lead_name: leadName,
          last_message_at: now,
          status: "open",
          ad_id: adId,
          campaign_id: campaignId,
        } as never)
        .select("id")
        .single();
      if (createError) {
        console.warn("[WA Webhook] Erro ao criar conversa:", createError.message);
        return NextResponse.json({ success: true }, { status: 200 });
      }
      const createdConversation = (createdConv as { id: string } | null) ?? null;
      conversationId = createdConversation?.id ?? null;
    } else {
      const { error: updateError } = await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: now,
          lead_name: leadName ?? undefined,
          ad_id: adId ?? undefined,
          campaign_id: campaignId ?? undefined,
          business_phone_id: client.whatsapp_business_phone_id ?? businessPhoneId,
        } as never)
        .eq("id", conversationId);
      if (updateError) {
        console.warn("[WA Webhook] Erro ao atualizar conversa:", updateError.message);
      }
    }

    if (conversationId) {
      if (waMessageId) {
        const { error: msgError } = await supabase
          .from("whatsapp_messages")
          .upsert(
            {
              conversation_id: conversationId,
              sender_type: "lead",
              message_body: messageBody || "(mensagem)",
              wa_message_id: waMessageId,
              created_at: now,
            } as never,
            { onConflict: "wa_message_id" }
          );
        if (msgError) {
          console.warn("[WA Webhook] Erro ao salvar mensagem:", msgError.message);
        }
      } else {
        const { error: msgError } = await supabase
          .from("whatsapp_messages")
          .insert({
            conversation_id: conversationId,
            sender_type: "lead",
            message_body: messageBody || "(mensagem)",
            wa_message_id: null,
            created_at: now,
          } as never);
        if (msgError) {
          console.warn("[WA Webhook] Erro ao salvar mensagem sem ID:", msgError.message);
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[WA Webhook] Falha inesperada:", err);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}