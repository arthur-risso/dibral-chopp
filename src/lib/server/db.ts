import "server-only";
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http";

let client: SupabaseClient | null = null;

/**
 * Cliente Supabase com a service role key, que ignora RLS. Por isso só
 * pode rodar no servidor: o import de "server-only" faz o build falhar se
 * algum componente do navegador tentar importar este arquivo.
 */
export function getDb(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new HttpError(500, "Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas.");
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    // tratado logo abaixo
  }
  if (
    !parsed ||
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".supabase.co") ||
    parsed.pathname !== "/"
  ) {
    throw new HttpError(
      500,
      "SUPABASE_URL inválida. Use exatamente a Project URL da API (Supabase > Project Settings > API), no formato https://xxxxxxxx.supabase.co, sem caminho extra e sem barra no final."
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

type DbMessages = { unique?: string; foreignKey?: string; notFound?: string };

/**
 * Converte um erro do Supabase em HttpError. Erros esperados (duplicado,
 * não encontrado…) viram mensagens amigáveis; o resto é logado no
 * servidor e o usuário recebe uma mensagem genérica.
 */
export function dbError(error: PostgrestError, messages: DbMessages = {}): HttpError {
  switch (error.code) {
    case "23505":
      return new HttpError(409, messages.unique ?? "Registro duplicado.");
    case "23503":
      return new HttpError(409, messages.foreignKey ?? "Registro relacionado não encontrado ou ainda em uso.");
    case "PGRST116":
      return new HttpError(404, messages.notFound ?? "Registro não encontrado.");
    case "22P02":
    case "22003":
    case "23502":
    case "23514":
      return new HttpError(400, "Dados inválidos.");
  }
  console.error("[supabase]", error.code, error.message, error.details ?? "");
  return new HttpError(500, "Erro ao acessar o banco de dados.");
}

/** Não pode passar do "Max rows" da API do Supabase (padrão: 1000). */
export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

/**
 * Busca todas as linhas de uma consulta, página por página — o Supabase
 * devolve no máximo 1000 linhas por requisição e corta o resto sem
 * avisar. A consulta precisa ter uma ordenação estável (ex.: por id).
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw dbError(error);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** Relações do PostgREST podem vir como objeto ou como array. */
export type Relation<T> = T | T[] | null;

export function one<T>(relation: Relation<T> | undefined): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export function comboKey(clienteId: string, produtoId: string): string {
  return `${clienteId}__${produtoId}`;
}
