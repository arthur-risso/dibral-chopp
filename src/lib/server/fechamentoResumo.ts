import "server-only";
import { getMondayISO, addWeeksISO } from "@/lib/week";
import { comboKey, dbError, fetchAll, getDb, one, type Relation } from "./db";
import type { Fechamento, ResumoFechamento, AlertaFechamento, ItemResumoProduto } from "@/lib/types";

type VendaRow = {
  cliente_id: string;
  produto_id: string;
  quantidade_barris: number;
  clientes: Relation<{ nome: string | null; codigo_principal: string; cidade: string | null }>;
  produtos: Relation<{ nome: string; marca: string }>;
};

type VendaSemanaRow = { cliente_id: string; produto_id: string; quantidade_barris: number };
type ReservaRow = { cliente_id: string; produto_id: string; quantidade: number; status: string };

export async function calcularResumoFechamento(fechamento: Fechamento): Promise<ResumoFechamento> {
  const db = getDb();
  const semanaInicio = getMondayISO(new Date(fechamento.data + "T00:00:00"));
  const semanaFim = addWeeksISO(semanaInicio, 1); // exclusivo (próxima segunda)

  // Vendas reconhecidas neste fechamento (o dia importado)
  const vendasDoDia = await fetchAll<VendaRow>((from, to) =>
    db
      .from("fechamento_vendas")
      .select(
        "cliente_id, produto_id, quantidade_barris, clientes(nome, codigo_principal, cidade), produtos(nome, marca)"
      )
      .eq("fechamento_id", fechamento.id)
      .order("id")
      .range(from, to)
  );

  // Total e ranking por produto (só o dia deste fechamento)
  const totalPorProduto = new Map<string, ItemResumoProduto>();
  let totalBarris = 0;
  for (const v of vendasDoDia) {
    totalBarris += v.quantidade_barris;
    const produto = one(v.produtos);
    const atual = totalPorProduto.get(v.produto_id);
    if (atual) {
      atual.barris += v.quantidade_barris;
    } else {
      totalPorProduto.set(v.produto_id, {
        produto_id: v.produto_id,
        produto_nome: produto?.nome || "—",
        marca: produto?.marca || "",
        barris: v.quantidade_barris,
      });
    }
  }
  const porProduto = Array.from(totalPorProduto.values()).sort((a, b) => b.barris - a.barris);

  // Agrupamento por cidade (código principal do cliente, sem repetir),
  // usado para a mensagem de WhatsApp dos pedidos do dia
  const codigosPorCidade = new Map<string, Set<string>>();
  for (const v of vendasDoDia) {
    const cliente = one(v.clientes);
    if (!cliente) continue;
    const cidade = cliente.cidade?.trim() || "SEM CIDADE";
    if (!codigosPorCidade.has(cidade)) codigosPorCidade.set(cidade, new Set());
    codigosPorCidade.get(cidade)!.add(cliente.codigo_principal);
  }

  const cidadesOrdenadas = Array.from(codigosPorCidade.keys())
    .filter((c) => c !== "SEM CIDADE")
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (codigosPorCidade.has("SEM CIDADE")) cidadesOrdenadas.push("SEM CIDADE");

  const porCidade = cidadesOrdenadas.map((cidade) => ({
    cidade: cidade.toUpperCase(),
    codigos: Array.from(codigosPorCidade.get(cidade)!).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true })
    ),
  }));

  // Fechamentos da mesma semana, até e incluindo a data deste fechamento
  // (para o acumulado usado no alerta de "excedeu a reserva")
  const { data: fechamentosSemana, error: errFechamentos } = await db
    .from("fechamentos")
    .select("id")
    .gte("data", semanaInicio)
    .lt("data", semanaFim)
    .lte("data", fechamento.data);
  if (errFechamentos) throw dbError(errFechamentos);

  const idsFechamentosSemana = (fechamentosSemana as { id: string }[]).map((f) => f.id);

  const acumuladoPorCombo = new Map<string, number>();
  if (idsFechamentosSemana.length > 0) {
    const vendasSemana = await fetchAll<VendaSemanaRow>((from, to) =>
      db
        .from("fechamento_vendas")
        .select("cliente_id, produto_id, quantidade_barris")
        .in("fechamento_id", idsFechamentosSemana)
        .order("id")
        .range(from, to)
    );
    for (const v of vendasSemana) {
      const key = comboKey(v.cliente_id, v.produto_id);
      acumuladoPorCombo.set(key, (acumuladoPorCombo.get(key) || 0) + v.quantidade_barris);
    }
  }

  // Reservas da semana, para comparar com o que foi vendido
  const reservasSemana = await fetchAll<ReservaRow>((from, to) =>
    db
      .from("reservas")
      .select("cliente_id, produto_id, quantidade, status")
      .eq("semana_referencia", semanaInicio)
      .order("id")
      .range(from, to)
  );

  const reservaPorCombo = new Map<string, number>();
  for (const r of reservasSemana) {
    if (r.status === "cancelado") continue;
    const key = comboKey(r.cliente_id, r.produto_id);
    reservaPorCombo.set(key, (reservaPorCombo.get(key) || 0) + r.quantidade);
  }

  const alertas: AlertaFechamento[] = [];
  const combosVistos = new Set<string>();
  for (const v of vendasDoDia) {
    const key = comboKey(v.cliente_id, v.produto_id);
    if (combosVistos.has(key)) continue;
    combosVistos.add(key);

    const cliente = one(v.clientes);
    const produto = one(v.produtos);
    const clienteNome = cliente?.nome?.trim() || cliente?.codigo_principal || "—";
    const produtoNome = produto?.nome || "—";

    const reservado = reservaPorCombo.get(key) || 0;
    const acumulado = acumuladoPorCombo.get(key) || 0;

    if (reservado === 0) {
      alertas.push({
        tipo: "sem_reserva",
        cliente_id: v.cliente_id,
        cliente_nome: clienteNome,
        produto_id: v.produto_id,
        produto_nome: produtoNome,
        quantidade_vendida_semana: acumulado,
        quantidade_reservada: 0,
      });
    } else if (acumulado > reservado) {
      alertas.push({
        tipo: "excedeu_reserva",
        cliente_id: v.cliente_id,
        cliente_nome: clienteNome,
        produto_id: v.produto_id,
        produto_nome: produtoNome,
        quantidade_vendida_semana: acumulado,
        quantidade_reservada: reservado,
      });
    }
  }

  return {
    fechamento,
    total_barris: totalBarris,
    por_produto: porProduto,
    por_cidade: porCidade,
    alertas,
    linhas_ignoradas: fechamento.total_linhas - fechamento.linhas_reconhecidas,
  };
}
