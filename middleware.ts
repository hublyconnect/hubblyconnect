import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware-client";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclui /api (webhooks, auth, cron), assets estáticos e imagens
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
