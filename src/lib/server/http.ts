import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** Erro com status HTTP e uma mensagem segura para mostrar ao usuário. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

type RouteOptions = {
  /** Rotas públicas (login/logout) não exigem sessão. */
  public?: boolean;
};

/**
 * Envolve um route handler com:
 * - checagem da sessão — o proxy já barra antes, mas a própria doc do
 *   Next recomenda não depender só dele (defesa em profundidade);
 * - tratamento de erros: HttpError vira resposta com a mensagem dele;
 *   qualquer outro erro é logado no servidor e o cliente recebe uma
 *   mensagem genérica, sem detalhes internos do banco.
 */
export function route<P extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, params: P) => Promise<Response>,
  options: RouteOptions = {}
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      if (!options.public && !verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
        throw new HttpError(401, "Não autenticado.");
      }
      const params = ((await ctx?.params) ?? {}) as P;
      return await handler(req, params);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}:`, e);
      return json({ error: "Erro interno no servidor. Tente novamente." }, 500);
    }
  };
}

/** Lê o corpo JSON e valida com o schema; qualquer problema vira um 400 com mensagem clara. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Requisição inválida.");
  }
  return parseWith(schema, raw);
}

export function parseWith<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const index = issue?.path.find((p) => typeof p === "number");
  const suffix = typeof index === "number" ? ` (item ${index + 1} da lista)` : "";
  throw new HttpError(400, `${issue?.message ?? "Dados inválidos."}${suffix}`);
}
