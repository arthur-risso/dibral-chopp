import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();

  if (body.estoque_minimo === undefined || Number(body.estoque_minimo) < 0) {
    return NextResponse.json({ error: "estoque_minimo inválido." }, { status: 400 });
  }

  const { data, error } = await db
    .from("produtos")
    .update({ estoque_minimo: Number(body.estoque_minimo) })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ produto: data });
}
