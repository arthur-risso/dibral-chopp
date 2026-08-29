import type { SupabaseClient } from "@supabase/supabase-js";
import { getMondayISO, addWeeksISO } from "@/lib/week";
import type { Fechamento, ResumoFechamento, AlertaFechamento, ItemResumoProduto } from "@/lib/types";

export async function calcularResumoFechamento(
  db: SupabaseClient,
  fechamento: Fechamento
): Promise<ResumoFechamento> {
  const semanaInicio = getMondayISO(new Date(fechamento.data + "T00:00:00"));
  const semanaFim = addWeeksISO(semanaInicio, 1); // exclusivo (próxima segunda)

  // Vendas reconhecidas neste fechamento (o dia importado)
  const { data: vendasDoDiaRaw } = await db
    .from("fechamento_vendas")
    .select(
      "cliente_id, produto_id, quantidade_barris, clientes(nome, codigo_principal, cidade), produtos(nome, marca)"
    )
    .eq("fechamento_id", fechamento.id);

  type VendaRow = {
    cliente_id: string;
    produto_id: string;
    quantidade_barris: number;
    clientes:
      | { nome: string | null; codigo_principal: string; cidade: string | null }
      | { nome: string | null; codigo_principal: string; cidade: string | null }[]
      | null;
    produtos: { nome: string; marca: string } | { nome: string; marca: string }[] | null;
  };
  const vendasDoDia = (vendasDoDiaRaw as VendaRow[]) || [];

  // Total e ranking por produto (só o dia deste fechamento)
  const totalPorProduto = new Map<string, ItemResumoProduto>();
  let totalBarris = 0;
  for (const v of vendasDoDia) {
    totalBarris += v.quantidade_barris;
    const produto = Array.isArray(v.produtos) ? v.produtos[0] : v.produtos;
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
    const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
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
  const { data: fechamentosSemana } = await db
    .from("fechamentos")
    .select("id, data")
    .gte("data", semanaInicio)
    .lt("data", semanaFim)
    .lte("data", fechamento.data);

  const idsFechamentosSemana = (fechamentosSemana || []).map((f) => f.id);

  const acumuladoPorCombo = new Map<string, number>();
  if (idsFechamentosSemana.length > 0) {
    const { data: vendasSemana } = await db
      .from("fechamento_vendas")
      .select("cliente_id, produto_id, quantidade_barris")
      .in("fechamento_id", idsFechamentosSemana);

    for (const v of vendasSemana || []) {
      const key = `${v.cliente_id}__${v.produto_id}`;
      acumuladoPorCombo.set(key, (acumuladoPorCombo.get(key) || 0) + v.quantidade_barris);
    }
  }

  // Reservas da semana, para comparar com o que foi vendido
  const { data: reservasSemana } = await db
    .from("reservas")
    .select("cliente_id, produto_id, quantidade, status")
    .eq("semana_referencia", semanaInicio);

  const reservaPorCombo = new Map<string, number>();
  for (const r of reservasSemana || []) {
    if (r.status === "cancelado") continue;
    const key = `${r.cliente_id}__${r.produto_id}`;
    reservaPorCombo.set(key, (reservaPorCombo.get(key) || 0) + r.quantidade);
  }

  const alertas: AlertaFechamento[] = [];
  const combosVistos = new Set<string>();
  for (const v of vendasDoDia) {
    const key = `${v.cliente_id}__${v.produto_id}`;
    if (combosVistos.has(key)) continue;
    combosVistos.add(key);

    const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
    const produto = Array.isArray(v.produtos) ? v.produtos[0] : v.produtos;
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
