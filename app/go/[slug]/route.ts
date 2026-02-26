import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BOT_REGEX = /bot|crawler|spider|facebookexternalhit|whatsapp/i;
const FALLBACK_URL = process.env.TRACKING_FALLBACK_URL || "/";

function inferDeviceType(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|webos|blackberry|iemobile|opera mini/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const supabase = createAdminClient();

  const { data: linkData, error: linkError } = await supabase
    .from("tracking_links")
    .select("id, client_id, destination_url")
    .eq("slug", slug)
    .single();
  const link = linkData as { id: string; client_id: string; destination_url: string } | null;

  if (linkError || !link) {
    return NextResponse.redirect(FALLBACK_URL, 302);
  }

  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent") ?? null;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const isBot = userAgent ? BOT_REGEX.test(userAgent) : false;

  const utm_source = url.searchParams.get("utm_source") ?? null;
  const utm_medium = url.searchParams.get("utm_medium") ?? null;
  const utm_campaign = url.searchParams.get("utm_campaign") ?? null;
  const utm_content = url.searchParams.get("utm_content") ?? null;
  const utm_term = url.searchParams.get("utm_term") ?? null;
  const fbclid = url.searchParams.get("fbclid") ?? null;

  await supabase.from("tracking_clicks").insert({
    client_id: link.client_id,
    destination_url: link.destination_url,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    ip_address: ip,
    user_agent: userAgent,
    device_type: inferDeviceType(userAgent),
    is_bot: isBot,
    status: "clicked",
  } as never);

  return NextResponse.redirect(link.destination_url, 302);
}
