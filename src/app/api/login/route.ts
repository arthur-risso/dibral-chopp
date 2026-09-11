import { HttpError, json, parseBody, route } from "@/lib/server/http";
import { loginSchema } from "@/lib/server/schemas";
import { clientIp, createFailureLimiter } from "@/lib/server/rateLimit";
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionConfigError,
  passwordMatches,
  sessionCookieOptions,
} from "@/lib/server/session";

// 5 senhas erradas bloqueiam o IP por 15 minutos
const limiter = createFailureLimiter({ maxFailures: 5, windowMs: 15 * 60 * 1000 });

const TAMANHO_MINIMO_RECOMENDADO = 12;

export const POST = route(
  async (req) => {
    const configError = getSessionConfigError();
    if (configError) throw new HttpError(500, configError);

    const ip = clientIp(req);
    const retryAfter = limiter.retryAfter(ip);
    if (retryAfter > 0) {
      return json(
        { error: `Muitas tentativas erradas. Tente de novo em ${Math.ceil(retryAfter / 60)} minuto(s).` },
        429,
        { "Retry-After": String(retryAfter) }
      );
    }

    const { password } = await parseBody(req, loginSchema);
    if (!passwordMatches(password)) {
      limiter.registerFailure(ip);
      throw new HttpError(401, "Senha incorreta.");
    }
    limiter.reset(ip);

    if ((process.env.APP_PASSWORD ?? "").length < TAMANHO_MINIMO_RECOMENDADO) {
      console.warn(
        `[auth] APP_PASSWORD tem menos de ${TAMANHO_MINIMO_RECOMENDADO} caracteres — use uma senha mais longa.`
      );
    }

    const res = json({ ok: true });
    res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
    return res;
  },
  { public: true }
);
