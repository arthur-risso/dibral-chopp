import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const STATUSES = ["reservado", "entregue", "cancelado"];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.quantidade !== undefined) {
    if (Number(body.quantidade) <= 0) {
      return NextResponse.json({ error: "Quantidade deve ser maior que zero." }, { status: 400 });
    }
    update.quantidade = Number(body.quantidade);
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    update.status = body.status;
  }

  const { data, error } = await db
    .from("reservas")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reserva: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("reservas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
