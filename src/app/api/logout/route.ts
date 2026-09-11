import { json, route } from "@/lib/server/http";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/session";

export const POST = route(
  async () => {
    const res = json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return res;
  },
  { public: true }
);
