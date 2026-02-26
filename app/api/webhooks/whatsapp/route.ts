import { NextRequest, NextResponse } from "next/server";

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
  // Por enquanto, apenas retorna 200 para a Meta não dar erro
  return NextResponse.json({ success: true }, { status: 200 });
}