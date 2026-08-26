import { createClient } from "@supabase/supabase-js";

// Este cliente usa a service role key e só deve ser importado em código
// que roda no servidor (API routes). Nunca importe este arquivo em
// componentes marcados com "use client".
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `SUPABASE_URL inválida: "${url}". Deve ser a Project URL da API, no formato https://xxxxxxxx.supabase.co (Supabase > Project Settings > API) — não é o link do dashboard.`
    );
  }
  if (!parsed.hostname.endsWith(".supabase.co") || parsed.pathname !== "/") {
    throw new Error(
      `SUPABASE_URL parece incorreta: "${url}". Use exatamente a Project URL da API (Supabase > Project Settings > API), no formato https://xxxxxxxx.supabase.co, sem caminho extra e sem barra no final.`
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseAdmin = getSupabaseAdmin;
