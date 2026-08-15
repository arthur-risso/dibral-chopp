import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMondayISO } from "@/lib/week";
import type { SugestaoProduto } from "@/lib/types";

const SEMANAS_PARA_MEDIA = 4;

export async function GET() {
  const db = supabaseAdmin();
  const semanaAtual = getMondayISO();

  const [{ data: produtos, error: errProdutos }, { data: estoque, error: errEstoque }] =
    await Promise.all([
      db.from("produtos").select("*").order("ordem", { ascending: true }),
      db.from("estoque").select("*"),
    ]);
  if (errProdutos) return NextResponse.json({ error: errProdutos.message }, { status: 500 });
  if (errEstoque) return NextResponse.json({ error: errEstoque.message }, { status: 500 });

  // 1) Últimas semanas anteriores à atual que têm reservas registradas
  const { data: semanasRows, error: errSemanas } = await db
    .from("reservas")
    .select("semana_referencia")
    .lt("semana_referencia", semanaAtual)
    .neq("status", "cancelado")
    .order("semana_referencia", { ascending: false });
  if (errSemanas) return NextResponse.json({ error: errSemanas.message }, { status: 500 });

  const semanasUnicas = Array.from(
    new Set((semanasRows || []).map((r) => r.semana_referencia as string))
  ).slice(0, SEMANAS_PARA_MEDIA);

  // 2) Soma de reservas por produto nessas semanas
  const totaisHistorico = new Map<string, number>();
  if (semanasUnicas.length > 0) {
    const { data: histRows, error: errHist } = await db
      .from("reservas")
      .select("produto_id, quantidade")
      .in("semana_referencia", semanasUnicas)
      .neq("status", "cancelado");
    if (errHist) return NextResponse.json({ error: errHist.message }, { status: 500 });

    for (const row of histRows || []) {
      totaisHistorico.set(
        row.produto_id,
        (totaisHistorico.get(row.produto_id) || 0) + row.quantidade
      );
    }
  }

  // 3) Reservas já feitas para a semana atual
  const { data: atualRows, error: errAtual } = await db
    .from("reservas")
    .select("produto_id, quantidade")
    .eq("semana_referencia", semanaAtual)
    .neq("status", "cancelado");
  if (errAtual) return NextResponse.json({ error: errAtual.message }, { status: 500 });

  const totaisSemanaAtual = new Map<string, number>();
  for (const row of atualRows || []) {
    totaisSemanaAtual.set(
      row.produto_id,
      (totaisSemanaAtual.get(row.produto_id) || 0) + row.quantidade
    );
  }

  const estoquePorProduto = new Map((estoque || []).map((e) => [e.produto_id, e.quantidade_atual]));

  const sugestoes: SugestaoProduto[] = (produtos || []).map((p) => {
    const estoqueAtual = estoquePorProduto.get(p.id) ?? 0;
    const reservasSemanaAtual = totaisSemanaAtual.get(p.id) ?? 0;
    const somaHistorico = totaisHistorico.get(p.id) ?? 0;
    const mediaMovel =
      semanasUnicas.length > 0 ? somaHistorico / semanasUnicas.length : null;

    const necessidadeEstimada = Math.max(reservasSemanaAtual, Math.round(mediaMovel ?? 0));
    const sugestaoPuxar = Math.max(necessidadeEstimada - estoqueAtual, 0);

    return {
      produto_id: p.id,
      produto_nome: p.nome,
      marca: p.marca,
      estoque_atual: estoqueAtual,
      estoque_minimo: p.estoque_minimo,
      estoque_baixo: estoqueAtual < p.estoque_minimo,
      reservas_semana_atual: reservasSemanaAtual,
      media_ultimas_semanas: mediaMovel,
      semanas_com_historico: semanasUnicas.length,
      necessidade_estimada: necessidadeEstimada,
      sugestao_puxar: sugestaoPuxar,
    };
  });

  return NextResponse.json({
    semana_atual: semanaAtual,
    semanas_consideradas: semanasUnicas,
    sugestoes,
  });
}
