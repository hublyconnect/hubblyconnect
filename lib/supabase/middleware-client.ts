import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Limpa cookies de sessão Supabase para evitar loop de erro de refresh token */
function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest): NextResponse {
  const allCookies = request.cookies.getAll();
  for (const { name } of allCookies) {
    if (name.startsWith("sb-") && name.includes("auth")) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Skip auth for API routes, static assets, and login
  if (url.pathname.startsWith("/api")) {
    return NextResponse.next({ request });
  }
  if (url.pathname === "/login" || url.pathname === "/") {
    return NextResponse.next({ request });
  }

  const isDashboard = url.pathname.startsWith("/dashboard");
  const isPortal = url.pathname.startsWith("/portal");
  const needsAuth = isDashboard || isPortal;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (needsAuth) {
      return NextResponse.redirect(new URL("/login?error=config", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (needsAuth && !user) {
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAuthFetchError =
      message.includes("Failed to fetch") ||
      message.includes("refresh") ||
      message.includes("auth") ||
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed");

    if (isAuthFetchError && needsAuth) {
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      url.searchParams.set("error", "session");
      const redirectResponse = NextResponse.redirect(url);
      clearSupabaseAuthCookies(redirectResponse, request);
      return redirectResponse;
    }

    return response;
  }
}
