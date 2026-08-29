import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calcularResumoFechamento } from "@/lib/fechamentoResumo";
import { getMondayISO } from "@/lib/week";
import type { Fechamento, StatusReserva } from "@/lib/types";

/**
 * Aplica as vendas de um fechamento nas reservas da semana:
 * - Se existe reserva para aquele cliente+produto, desconta a
 *   quantidade entregue no dia. Se chegar a 0, marca como "entregue".
 * - Se não existe nenhuma reserva, cria uma nova já como "entregue",
 *   só para manter o registro do que saiu sem reserva prévia.
 *
 * Cada fechamento só pode ser sincronizado uma vez (evita descontar
 * a mesma entrega duas vezes se o botão for clicado de novo).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: fechamento, error: errFechamento } = await db
    .from("fechamentos")
    .select("*")
    .eq("id", id)
    .single();
  if (errFechamento || !fechamento) {
    return NextResponse.json({ error: "Fechamento não encontrado." }, { status: 404 });
  }
  if (fechamento.sincronizado_em) {
    return NextResponse.json({ error: "Esse fechamento já foi sincronizado." }, { status: 400 });
  }

  const { data: vendas, error: errVendas } = await db
    .from("fechamento_vendas")
    .select("cliente_id, produto_id, quantidade_barris")
    .eq("fechamento_id", id);
  if (errVendas) return NextResponse.json({ error: errVendas.message }, { status: 500 });

  const semana = getMondayISO(new Date(fechamento.data + "T00:00:00"));

  const { data: reservasSemana, error: errReservas } = await db
    .from("reservas")
    .select("id, cliente_id, produto_id, quantidade, status")
    .eq("semana_referencia", semana);
  if (errReservas) return NextResponse.json({ error: errReservas.message }, { status: 500 });

  const reservaPorCombo = new Map(
    (reservasSemana || []).map((r) => [`${r.cliente_id}__${r.produto_id}`, r])
  );

  let atualizadas = 0;
  let criadas = 0;

  for (const v of vendas || []) {
    const key = `${v.cliente_id}__${v.produto_id}`;
    const existente = reservaPorCombo.get(key);

    if (existente) {
      const novaQuantidade = Math.max(existente.quantidade - v.quantidade_barris, 0);
      const novoStatus: StatusReserva = novaQuantidade === 0 ? "entregue" : (existente.status as StatusReserva);
      const { error } = await db
        .from("reservas")
        .update({ quantidade: novaQuantidade, status: novoStatus })
        .eq("id", existente.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      atualizadas++;
    } else {
      const { error } = await db.from("reservas").insert({
        cliente_id: v.cliente_id,
        produto_id: v.produto_id,
        semana_referencia: semana,
        quantidade: v.quantidade_barris,
        status: "entregue",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      criadas++;
    }
  }

  const { data: fechamentoAtualizado, error: errUpdate } = await db
    .from("fechamentos")
    .update({ sincronizado_em: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (errUpdate) return NextResponse.json({ error: errUpdate.message }, { status: 500 });

  const resumo = await calcularResumoFechamento(db, fechamentoAtualizado as Fechamento);
  return NextResponse.json({ resumo, reservas_atualizadas: atualizadas, reservas_criadas: criadas });
}
