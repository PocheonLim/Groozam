import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/signup?error=confirmation", request.url));
  // Destinations are fixed: never accept next/redirectTo or forwarded host input.
  const redirect = (path: string) => {
    response.headers.set("Location", new URL(path, request.url).toString());
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error")) {
    return redirect("/signup?error=confirmation");
  }
  try {
    // Write directly onto the exact redirect response returned to the browser.
    // This also preserves chunked session cookies and PKCE verifier removal.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies, headers) {
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      } },
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) return redirect("/auth/confirmed");
    console.warn("[auth/callback] Session exchange failed", { status: error?.status });
  } catch {
    console.warn("[auth/callback] Session exchange unavailable");
  }
  return redirect("/signup?error=confirmation");
}
