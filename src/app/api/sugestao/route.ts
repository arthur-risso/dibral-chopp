import { json, route } from "@/lib/server/http";
import { PAGE_SIZE, dbError, fetchAll, getDb } from "@/lib/server/db";
import { listarProdutosComEstoque } from "@/lib/server/produtos";
import { getMondayISO } from "@/lib/week";
import type { SugestaoProduto } from "@/lib/types";

const SEMANAS_PARA_MEDIA = 4;

type LinhaReserva = { produto_id: string; quantidade: number };

/** As `quantidade` semanas mais recentes, antes de `antesDe`, que têm reservas registradas. */
async function ultimasSemanasComReservas(antesDe: string, quantidade: number): Promise<string[]> {
  const db = getDb();
  const semanas: string[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("reservas")
      .select("semana_referencia")
      .lt("semana_referencia", antesDe)
      .neq("status", "cancelado")
      .order("semana_referencia", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw dbError(error);

    for (const { semana_referencia } of data as { semana_referencia: string }[]) {
      if (semanas[semanas.length - 1] === semana_referencia) continue;
      if (semanas.length === quantidade) return semanas;
      semanas.push(semana_referencia);
    }
    if (data.length < PAGE_SIZE) return semanas;
  }
}

function somarPorProduto(linhas: LinhaReserva[]): Map<string, number> {
  const totais = new Map<string, number>();
  for (const l of linhas) totais.set(l.produto_id, (totais.get(l.produto_id) || 0) + l.quantidade);
  return totais;
}

export const GET = route(async () => {
  const db = getDb();
  const semanaAtual = getMondayISO();

  const [produtos, semanas, reservasAtuais] = await Promise.all([
    listarProdutosComEstoque(),
    ultimasSemanasComReservas(semanaAtual, SEMANAS_PARA_MEDIA),
    fetchAll<LinhaReserva>((from, to) =>
      db
        .from("reservas")
        .select("produto_id, quantidade")
        .eq("semana_referencia", semanaAtual)
        .neq("status", "cancelado")
        .order("id")
        .range(from, to)
    ),
  ]);

  const reservasHistorico =
    semanas.length > 0
      ? await fetchAll<LinhaReserva>((from, to) =>
          db
            .from("reservas")
            .select("produto_id, quantidade")
            .in("semana_referencia", semanas)
            .neq("status", "cancelado")
            .order("id")
            .range(from, to)
        )
      : [];

  const totaisHistorico = somarPorProduto(reservasHistorico);
  const totaisSemanaAtual = somarPorProduto(reservasAtuais);

  const sugestoes: SugestaoProduto[] = produtos.map((p) => {
    const estoqueAtual = p.quantidade_atual;
    const reservasSemanaAtual = totaisSemanaAtual.get(p.id) ?? 0;
    const somaHistorico = totaisHistorico.get(p.id) ?? 0;
    const mediaMovel = semanas.length > 0 ? somaHistorico / semanas.length : null;

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
      semanas_com_historico: semanas.length,
      necessidade_estimada: necessidadeEstimada,
      sugestao_puxar: sugestaoPuxar,
    };
  });

  return json({
    semana_atual: semanaAtual,
    semanas_consideradas: semanas,
    sugestoes,
  });
});
