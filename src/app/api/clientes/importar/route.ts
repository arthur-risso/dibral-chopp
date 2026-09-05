import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type LinhaEntrada = {
  nome?: string;
  codigo_principal: string;
  codigo_secundario?: string;
  whatsapp?: string;
  setor?: string;
  cidade?: string;
};

export async function POST(req: Request) {
  const db = supabaseAdmin();

  let body: { clientes?: LinhaEntrada[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const clientes = body.clientes;
  if (!Array.isArray(clientes) || clientes.length === 0) {
    return NextResponse.json({ error: "Nenhum cliente para importar." }, { status: 400 });
  }

  const linhas = clientes
    .filter((c) => c.codigo_principal && c.codigo_principal.trim())
    .map((c) => ({
      nome: c.nome?.trim() || null,
      codigo_principal: c.codigo_principal.trim(),
      codigo_secundario: c.codigo_secundario?.trim() || null,
      whatsapp: c.whatsapp?.trim() || null,
      setor: c.setor?.trim() || null,
      cidade: c.cidade?.trim() || null,
      ativo: true,
    }));

  if (linhas.length === 0) {
    return NextResponse.json({ error: "Nenhum cliente válido para importar." }, { status: 400 });
  }

  // Clientes cujo código principal já existe são ignorados (não sobrescreve
  // cadastros existentes) em vez de travar a importação inteira.
  const { data, error } = await db
    .from("clientes")
    .upsert(linhas, { onConflict: "codigo_principal", ignoreDuplicates: true })
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const importados = data?.length || 0;
  return NextResponse.json({
    total: linhas.length,
    importados,
    ignorados: linhas.length - importados,
  });
}
