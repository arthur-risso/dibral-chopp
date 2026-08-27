import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calcularResumoFechamento } from "@/lib/fechamentoResumo";
import type { Fechamento } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: fechamento, error } = await db.from("fechamentos").select("*").eq("id", id).single();
  if (error || !fechamento) {
    return NextResponse.json({ error: "Fechamento não encontrado." }, { status: 404 });
  }

  const resumo = await calcularResumoFechamento(db, fechamento as Fechamento);
  return NextResponse.json({ resumo });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("fechamentos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
