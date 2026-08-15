import { createClient } from "@supabase/supabase-js";

// Este cliente usa a service role key e só deve ser importado em código
// que roda no servidor (API routes). Nunca importe este arquivo em
// componentes marcados com "use client".
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseAdmin = getSupabaseAdmin;
