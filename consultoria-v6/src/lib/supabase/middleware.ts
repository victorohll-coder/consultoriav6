import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth if Supabase is not configured
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Not authenticated — allow login page, redirect others
  if (!user) {
    if (pathname === "/login" || pathname === "/") {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated — get role from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "paciente";

  // Redirect root
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = role === "paciente" ? "/minha-area" : "/painel/alertas";
    return NextResponse.redirect(url);
  }

  // Redirect login if already authenticated
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = role === "paciente" ? "/minha-area" : "/painel/alertas";
    return NextResponse.redirect(url);
  }

  // Paciente trying to access painel
  if (role === "paciente" && pathname.startsWith("/painel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/minha-area";
    return NextResponse.redirect(url);
  }

  // Profissional trying to access minha-area
  if (role !== "paciente" && pathname.startsWith("/minha-area")) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel/alertas";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
