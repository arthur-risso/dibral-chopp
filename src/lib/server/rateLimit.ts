import "server-only";

type Entry = { failures: number; expiresAt: number };

const MAX_ENTRIES = 10_000;

/**
 * Bloqueia uma chave (ex.: IP) depois de `maxFailures` falhas dentro da
 * janela. Fica em memória: na Vercel cada instância tem a sua, então é
 * uma proteção "melhor esforço" contra força bruta — a defesa principal
 * continua sendo uma APP_PASSWORD longa.
 */
export function createFailureLimiter({ maxFailures, windowMs }: { maxFailures: number; windowMs: number }) {
  const entries = new Map<string, Entry>();

  function purgeExpired(now: number) {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(key);
    }
    if (entries.size > MAX_ENTRIES) entries.clear();
  }

  return {
    /** Segundos até a chave poder tentar de novo (0 = liberada). */
    retryAfter(key: string): number {
      const entry = entries.get(key);
      if (!entry) return 0;
      const now = Date.now();
      if (entry.expiresAt <= now) {
        entries.delete(key);
        return 0;
      }
      return entry.failures >= maxFailures ? Math.ceil((entry.expiresAt - now) / 1000) : 0;
    },

    registerFailure(key: string) {
      const now = Date.now();
      if (entries.size > MAX_ENTRIES / 2) purgeExpired(now);
      const entry = entries.get(key);
      if (!entry || entry.expiresAt <= now) {
        entries.set(key, { failures: 1, expiresAt: now + windowMs });
      } else {
        entry.failures++;
      }
    },

    reset(key: string) {
      entries.delete(key);
    },
  };
}

/** IP do cliente. Na Vercel o x-forwarded-for é definido pela própria plataforma. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "desconhecido"
  );
}
