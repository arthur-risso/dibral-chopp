import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.nome !== undefined) update.nome = body.nome?.trim() || null;
  if (body.codigo_principal !== undefined) {
    const codigo = String(body.codigo_principal).trim();
    if (!codigo) {
      return NextResponse.json({ error: "Código principal não pode ficar vazio." }, { status: 400 });
    }
    update.codigo_principal = codigo;
  }
  if (body.codigo_secundario !== undefined) update.codigo_secundario = body.codigo_secundario?.trim() || null;
  if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp?.trim() || null;
  if (body.ativo !== undefined) update.ativo = !!body.ativo;

  const { data, error } = await db
    .from("clientes")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const msg = error.code === "23505" ? "Já existe um cliente com esse código principal." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ cliente: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("clientes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
