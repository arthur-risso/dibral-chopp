import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionConfigError,
  sessionCookieOptions,
  shouldRenewSession,
  verifySessionToken,
} from "@/lib/server/session";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/logout"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Proteção contra CSRF: requisições que alteram dados só são aceitas se
 * vierem do próprio app. Navegadores modernos enviam Sec-Fetch-Site; nos
 * mais antigos, a checagem cai para o cabeçalho Origin.
 */
function isCrossSite(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.nextUrl.host;
  } catch {
    return true;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname === "/api" || pathname.startsWith("/api/");

  if (isApi && !SAFE_METHODS.has(req.method) && isCrossSite(req)) {
    return NextResponse.json({ error: "Origem da requisição não permitida." }, { status: 403 });
  }

  if (isPublic(pathname)) return NextResponse.next();

  // Se a senha/segredo não foram configurados no ambiente, bloqueia por
  // segurança e orienta a configuração, em vez de liberar o acesso.
  const configError = getSessionConfigError();
  if (configError) {
    if (isApi) return NextResponse.json({ error: configError }, { status: 500 });
    return NextResponse.redirect(new URL("/login?config=1", req.url));
  }

  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) {
    const res = NextResponse.next();
    if (shouldRenewSession(session)) {
      res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
    }
    return res;
  }

  if (isApi) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  const res = NextResponse.redirect(loginUrl);
  // Cookie expirado ou de uma versão antiga: remove para não ficar reenviando
  if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
