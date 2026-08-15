import { NextResponse } from "next/server";
import { SESSION_COOKIE, getExpectedSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = await getExpectedSessionToken();

  if (!expected) {
    return NextResponse.json(
      { error: "APP_PASSWORD não configurada no servidor." },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!body.password || body.password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}
