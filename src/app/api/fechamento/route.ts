import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calcularResumoFechamento } from "@/lib/fechamentoResumo";
import type { Fechamento } from "@/lib/types";
import type { VendaAgregada } from "@/lib/fechamentoAgregacao";

export async function GET() {
  const db = supabaseAdmin();
  const { data: fechamentos, error } = await db
    .from("fechamentos")
    .select("*")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lista = (fechamentos as Fechamento[]) || [];
  const ids = lista.map((f) => f.id);

  const totaisPorFechamento = new Map<string, number>();
  if (ids.length > 0) {
    const { data: vendas } = await db
      .from("fechamento_vendas")
      .select("fechamento_id, quantidade_barris")
      .in("fechamento_id", ids);
    for (const v of vendas || []) {
      totaisPorFechamento.set(v.fechamento_id, (totaisPorFechamento.get(v.fechamento_id) || 0) + v.quantidade_barris);
    }
  }

  const resultado = lista.map((f) => ({ ...f, total_barris: totaisPorFechamento.get(f.id) || 0 }));
  return NextResponse.json({ fechamentos: resultado });
}

/**
 * Recebe a lista de vendas JÁ casada com cliente/produto (calculada no
 * navegador a partir do CSV do Promax) — nunca o arquivo inteiro, para
 * não esbarrar no limite de tamanho de requisição da Vercel.
 */
export async function POST(req: Request) {
  const db = supabaseAdmin();

  let body: {
    data?: string;
    arquivo_nome?: string;
    total_linhas?: number;
    linhas_reconhecidas?: number;
    vendas?: VendaAgregada[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { data, arquivo_nome, total_linhas, linhas_reconhecidas, vendas } = body;

  if (!data || !Array.isArray(vendas) || vendas.length === 0) {
    return NextResponse.json(
      { error: "Não encontrei nenhuma linha de chopp reconhecida (cliente e produto cadastrados) nesse arquivo." },
      { status: 400 }
    );
  }

  const { data: produtos } = await db.from("produtos").select("id, volume_litros");
  const volumePorProduto = new Map((produtos || []).map((p) => [p.id, p.volume_litros]));

  const vendasValidas = vendas.filter((v) => volumePorProduto.has(v.produto_id) && v.cliente_id && v.quantidade_litros > 0);
  if (vendasValidas.length === 0) {
    return NextResponse.json({ error: "Nenhuma venda válida para importar." }, { status: 400 });
  }

  const { data: fechamento, error: errFechamento } = await db
    .from("fechamentos")
    .insert({
      data,
      arquivo_nome: arquivo_nome || null,
      total_linhas: total_linhas ?? vendasValidas.length,
      linhas_reconhecidas: linhas_reconhecidas ?? vendasValidas.length,
    })
    .select()
    .single();

  if (errFechamento) return NextResponse.json({ error: errFechamento.message }, { status: 500 });

  const vendasParaInserir = vendasValidas.map((v) => {
    const volume = volumePorProduto.get(v.produto_id) || 1;
    return {
      fechamento_id: fechamento.id,
      cliente_id: v.cliente_id,
      produto_id: v.produto_id,
      quantidade_litros: v.quantidade_litros,
      quantidade_barris: Math.round(v.quantidade_litros / volume),
    };
  });

  const { error: errVendas } = await db.from("fechamento_vendas").insert(vendasParaInserir);
  if (errVendas) return NextResponse.json({ error: errVendas.message }, { status: 500 });

  const resumo = await calcularResumoFechamento(db, fechamento as Fechamento);
  return NextResponse.json({ resumo }, { status: 201 });
}
