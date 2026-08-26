import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMondayISO } from "@/lib/week";

export async function GET(req: Request) {
  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const semana = searchParams.get("semana") || getMondayISO();

  const { data, error } = await db
    .from("reservas")
    .select(
      "id, cliente_id, produto_id, quantidade, semana_referencia, status, criado_em, clientes(nome, codigo_principal), produtos(nome, marca, ordem)"
    )
    .eq("semana_referencia", semana)
    .order("criado_em", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    cliente_id: string;
    produto_id: string;
    quantidade: number;
    semana_referencia: string;
    status: string;
    criado_em: string;
    clientes:
      | { nome: string | null; codigo_principal: string }
      | { nome: string | null; codigo_principal: string }[]
      | null;
    produtos: { nome: string; marca: string; ordem: number } | { nome: string; marca: string; ordem: number }[] | null;
  };

  const reservas = ((data as Row[]) || []).map((r) => {
    const cliente = Array.isArray(r.clientes) ? r.clientes[0] : r.clientes;
    const produto = Array.isArray(r.produtos) ? r.produtos[0] : r.produtos;
    return {
      id: r.id,
      cliente_id: r.cliente_id,
      produto_id: r.produto_id,
      quantidade: r.quantidade,
      semana_referencia: r.semana_referencia,
      status: r.status,
      criado_em: r.criado_em,
      cliente_nome: cliente?.nome?.trim() || cliente?.codigo_principal || "—",
      produto_nome: produto?.nome || "—",
      produto_marca: produto?.marca || "",
      produto_ordem: produto?.ordem ?? 999,
    };
  });

  return NextResponse.json({ reservas });
}

export async function POST(req: Request) {
  const db = supabaseAdmin();
  const body = await req.json();

  const { cliente_id, produto_id, quantidade, semana_referencia } = body;
  if (!cliente_id || !produto_id || !quantidade || !semana_referencia) {
    return NextResponse.json(
      { error: "Cliente, produto, quantidade e semana são obrigatórios." },
      { status: 400 }
    );
  }
  if (Number(quantidade) <= 0) {
    return NextResponse.json({ error: "Quantidade deve ser maior que zero." }, { status: 400 });
  }

  const { data, error } = await db
    .from("reservas")
    .insert({
      cliente_id,
      produto_id,
      quantidade: Number(quantidade),
      semana_referencia,
      status: "reservado",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reserva: data }, { status: 201 });
}

/**
 * Usado pela grade de reservas: uma célula (cliente + produto + semana)
 * é uma reserva só. Se já existir, atualiza a quantidade sem mexer no
 * status; se não existir, cria com status "reservado".
 */
export async function PUT(req: Request) {
  const db = supabaseAdmin();
  const body = await req.json();

  const { cliente_id, produto_id, quantidade, semana_referencia } = body;
  if (!cliente_id || !produto_id || !semana_referencia || quantidade === undefined) {
    return NextResponse.json(
      { error: "Cliente, produto, quantidade e semana são obrigatórios." },
      { status: 400 }
    );
  }
  if (Number(quantidade) <= 0) {
    return NextResponse.json({ error: "Quantidade deve ser maior que zero." }, { status: 400 });
  }

  const { data, error } = await db
    .from("reservas")
    .upsert(
      {
        cliente_id,
        produto_id,
        semana_referencia,
        quantidade: Number(quantidade),
      },
      { onConflict: "cliente_id,produto_id,semana_referencia" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reserva: data });
}
