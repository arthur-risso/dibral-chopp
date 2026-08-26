import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const apenasAtivos = searchParams.get("ativos") === "1";

  let query = db
    .from("clientes")
    .select("*")
    .order("nome", { ascending: true, nullsFirst: false })
    .order("codigo_principal", { ascending: true });
  if (apenasAtivos) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clientes: data });
}

export async function POST(req: Request) {
  const db = supabaseAdmin();
  const body = await req.json();

  const codigoPrincipal = (body.codigo_principal || "").trim();
  if (!codigoPrincipal) {
    return NextResponse.json({ error: "Código principal é obrigatório." }, { status: 400 });
  }

  const { data, error } = await db
    .from("clientes")
    .insert({
      nome: body.nome?.trim() || null,
      codigo_principal: codigoPrincipal,
      codigo_secundario: body.codigo_secundario?.trim() || null,
      whatsapp: body.whatsapp?.trim() || null,
      setor: body.setor?.trim() || null,
      cidade: body.cidade?.trim() || null,
      ativo: body.ativo ?? true,
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === "23505" ? "Já existe um cliente com esse código principal." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ cliente: data }, { status: 201 });
}
