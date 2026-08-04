import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  // Si hay error en OAuth, redirigir a login con mensaje
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${error}&description=${error_description}`, request.url)
    );
  }

  // Si no hay código, redirigir a login
  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Crear cliente Supabase para procesar el código
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    // Intercambiar código por sesión
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/login?error=oauth_exchange_failed&description=${encodeURIComponent(
            exchangeError.message
          )}`,
          request.url
        )
      );
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "No se pudo completar el inicio de sesión";
    return NextResponse.redirect(
      new URL(
        `/login?error=oauth_exchange_failed&description=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }

  return response;
}
