import { HttpError, json, parseWith, route } from "@/lib/server/http";
import { comboKey, dbError, fetchAll, getDb } from "@/lib/server/db";
import { calcularResumoFechamento } from "@/lib/server/fechamentoResumo";
import { idParamsSchema } from "@/lib/server/schemas";
import { getMondayISO } from "@/lib/week";
import type { Fechamento, StatusReserva } from "@/lib/types";

type VendaRow = { cliente_id: string; produto_id: string; quantidade_barris: number };
type ReservaRow = { cliente_id: string; produto_id: string; quantidade: number; status: StatusReserva };

/**
 * Aplica as vendas de um fechamento nas reservas da semana:
 * - Se existe reserva para aquele cliente+produto, desconta a
 *   quantidade entregue no dia. Se chegar a 0, marca como "entregue".
 * - Se não existe nenhuma reserva, cria uma nova já como "entregue",
 *   só para manter o registro do que saiu sem reserva prévia.
 *
 * Cada fechamento só pode ser sincronizado uma vez. A marcação é feita
 * ANTES de mexer nas reservas, num UPDATE condicional — assim dois
 * cliques simultâneos não descontam a mesma entrega duas vezes.
 */
export const POST = route<{ id: string }>(async (_req, params) => {
  const { id } = parseWith(idParamsSchema, params);
  const db = getDb();

  const { data: fechamento, error: errMarcar } = await db
    .from("fechamentos")
    .update({ sincronizado_em: new Date().toISOString() })
    .eq("id", id)
    .is("sincronizado_em", null)
    .select()
    .maybeSingle();
  if (errMarcar) throw dbError(errMarcar);

  if (!fechamento) {
    const { data: existente, error } = await db.from("fechamentos").select("id").eq("id", id).maybeSingle();
    if (error) throw dbError(error);
    if (!existente) throw new HttpError(404, "Fechamento não encontrado.");
    throw new HttpError(409, "Esse fechamento já foi sincronizado.");
  }

  let resultado: { atualizadas: number; criadas: number };
  try {
    resultado = await aplicarVendasNasReservas(fechamento as Fechamento);
  } catch (e) {
    // A gravação das reservas é uma única instrução (tudo ou nada), então
    // se chegou aqui nada foi aplicado: libera o fechamento para nova tentativa.
    await db.from("fechamentos").update({ sincronizado_em: null }).eq("id", id);
    throw e;
  }

  const resumo = await calcularResumoFechamento(fechamento as Fechamento);
  return json({
    resumo,
    reservas_atualizadas: resultado.atualizadas,
    reservas_criadas: resultado.criadas,
  });
});

async function aplicarVendasNasReservas(fechamento: Fechamento) {
  const db = getDb();
  const semana = getMondayISO(new Date(fechamento.data + "T00:00:00"));

  const [vendas, reservas] = await Promise.all([
    fetchAll<VendaRow>((from, to) =>
      db
        .from("fechamento_vendas")
        .select("cliente_id, produto_id, quantidade_barris")
        .eq("fechamento_id", fechamento.id)
        .order("id")
        .range(from, to)
    ),
    fetchAll<ReservaRow>((from, to) =>
      db
        .from("reservas")
        .select("cliente_id, produto_id, quantidade, status")
        .eq("semana_referencia", semana)
        .order("id")
        .range(from, to)
    ),
  ]);

  const entreguePorCombo = new Map<string, VendaRow>();
  for (const v of vendas) {
    const key = comboKey(v.cliente_id, v.produto_id);
    const atual = entreguePorCombo.get(key);
    if (atual) atual.quantidade_barris += v.quantidade_barris;
    else entreguePorCombo.set(key, { ...v });
  }

  const reservaPorCombo = new Map(reservas.map((r) => [comboKey(r.cliente_id, r.produto_id), r]));

  let atualizadas = 0;
  let criadas = 0;
  const linhas = Array.from(entreguePorCombo.entries()).map(([key, v]) => {
    const existente = reservaPorCombo.get(key);
    if (existente) {
      atualizadas++;
      const quantidade = Math.max(existente.quantidade - v.quantidade_barris, 0);
      const status: StatusReserva = quantidade === 0 ? "entregue" : existente.status;
      return { cliente_id: v.cliente_id, produto_id: v.produto_id, semana_referencia: semana, quantidade, status };
    }
    criadas++;
    return {
      cliente_id: v.cliente_id,
      produto_id: v.produto_id,
      semana_referencia: semana,
      quantidade: v.quantidade_barris,
      status: "entregue" as StatusReserva,
    };
  });

  if (linhas.length > 0) {
    const { error } = await db
      .from("reservas")
      .upsert(linhas, { onConflict: "cliente_id,produto_id,semana_referencia" });
    if (error) throw dbError(error);
  }

  return { atualizadas, criadas };
}
