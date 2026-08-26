import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Obtém o cliente Supabase ou, se a configuração estiver inválida
 * (ex.: SUPABASE_URL incorreta), devolve uma resposta JSON pronta
 * para ser retornada pela rota — em vez de deixar a exceção estourar
 * sem mensagem para quem está usando o sistema.
 */
export function getDbOrError() {
  try {
    return { db: supabaseAdmin(), error: null as null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao conectar ao banco de dados.";
    console.error("[supabase]", message);
    return {
      db: null,
      error: NextResponse.json({ error: message }, { status: 500 }),
    };
  }
}
