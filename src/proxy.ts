import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getExpectedSessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const expected = await getExpectedSessionToken();

  // Se a senha não foi configurada no ambiente, bloqueia por segurança
  // e orienta a configuração, em vez de liberar o acesso.
  if (!expected) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "APP_PASSWORD não configurada no servidor." },
        { status: 500 }
      );
    }
    return NextResponse.redirect(new URL("/login?config=1", req.url));
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (cookie && cookie === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
