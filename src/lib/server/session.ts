import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "dibral_session";

/** A sessão expira depois de 7 dias sem uso. */
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;
/** Quem está usando o app recebe um cookie renovado, no máximo 1x por dia. */
const RENEW_AFTER_S = 60 * 60 * 24;
const TOKEN_VERSION = 2;
const MAX_TOKEN_LENGTH = 512;

export type Session = { v: number; iat: number; exp: number };

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Chave que assina o cookie de sessão. Deriva de um segredo de alta
 * entropia (SESSION_SECRET ou, se não houver, a service role key) junto
 * com a APP_PASSWORD — trocar qualquer um dos dois derruba todas as
 * sessões abertas. Como o segredo nunca sai do servidor, quem obtiver um
 * cookie não consegue usá-lo para descobrir a senha por força bruta.
 */
function getSigningKey(): Buffer | null {
  const password = process.env.APP_PASSWORD;
  const secret =
    process.env.SESSION_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!password || !secret) return null;
  return createHmac("sha256", secret)
    .update(`dibral-chopp:session:v${TOKEN_VERSION}:${password}`)
    .digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Mensagem explicando o que falta configurar, ou null se estiver tudo certo. */
export function getSessionConfigError(): string | null {
  if (!process.env.APP_PASSWORD) return "APP_PASSWORD não configurada no servidor.";
  if (!getSigningKey()) return "SESSION_SECRET não configurada no servidor.";
  return null;
}

/** Token no formato `payload.assinatura`, com data de emissão e de expiração. */
export function createSessionToken(): string {
  const key = getSigningKey();
  if (!key) throw new Error("Sessão não configurada no servidor.");
  const now = nowSeconds();
  const session: Session = { v: TOKEN_VERSION, iat: now, exp: now + SESSION_MAX_AGE_S };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/** Devolve a sessão se o token for autêntico e ainda não tiver expirado. */
export function verifySessionToken(token: string | undefined): Session | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const key = getSigningKey();
  if (!key) return null;

  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return null;
  if (!safeEqual(Buffer.from(signature), Buffer.from(sign(payload, key)))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Session>;
    if (
      session.v !== TOKEN_VERSION ||
      typeof session.iat !== "number" ||
      typeof session.exp !== "number"
    ) {
      return null;
    }
    return session.exp > nowSeconds() ? (session as Session) : null;
  } catch {
    return null;
  }
}

export function shouldRenewSession(session: Session): boolean {
  return nowSeconds() - session.iat >= RENEW_AFTER_S;
}

/** Compara a senha em tempo constante (não vaza, pelo tempo de resposta, quantos caracteres bateram). */
export function passwordMatches(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return safeEqual(hash(candidate), hash(expected));
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_S) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
