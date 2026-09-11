import { HttpError, json, parseBody, route } from "@/lib/server/http";
import { comboKey, dbError, fetchAll, getDb } from "@/lib/server/db";
import { calcularResumoFechamento } from "@/lib/server/fechamentoResumo";
import { fechamentoCriarSchema } from "@/lib/server/schemas";
import type { Fechamento } from "@/lib/types";

export const GET = route(async () => {
  const db = getDb();

  const [fechamentos, vendas] = await Promise.all([
    fetchAll<Fechamento>((from, to) =>
      db
        .from("fechamentos")
        .select("*")
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ fechamento_id: string; quantidade_barris: number }>((from, to) =>
      db.from("fechamento_vendas").select("fechamento_id, quantidade_barris").order("id").range(from, to)
    ),
  ]);

  const totaisPorFechamento = new Map<string, number>();
  for (const v of vendas) {
    totaisPorFechamento.set(v.fechamento_id, (totaisPorFechamento.get(v.fechamento_id) || 0) + v.quantidade_barris);
  }

  return json({
    fechamentos: fechamentos.map((f) => ({ ...f, total_barris: totaisPorFechamento.get(f.id) || 0 })),
  });
});

/**
 * Recebe a lista de vendas JÁ casada com cliente/produto (calculada no
 * navegador a partir do CSV do Promax) — nunca o arquivo inteiro, para
 * não esbarrar no limite de tamanho de requisição da Vercel.
 */
export const POST = route(async (req) => {
  const body = await parseBody(req, fechamentoCriarSchema);
  const db = getDb();

  const { data: produtos, error: errProdutos } = await db.from("produtos").select("id, volume_litros");
  if (errProdutos) throw dbError(errProdutos);
  const volumePorProduto = new Map(
    (produtos as { id: string; volume_litros: number }[]).map((p) => [p.id, p.volume_litros])
  );

  // Garante uma venda por cliente+produto, que é o que a sincronização
  // com as reservas pressupõe (o navegador já agrega, mas não confiamos nisso)
  const litrosPorCombo = new Map<string, { cliente_id: string; produto_id: string; litros: number }>();
  for (const v of body.vendas) {
    if (!volumePorProduto.has(v.produto_id)) continue;
    const key = comboKey(v.cliente_id, v.produto_id);
    const atual = litrosPorCombo.get(key);
    if (atual) atual.litros += v.quantidade_litros;
    else litrosPorCombo.set(key, { cliente_id: v.cliente_id, produto_id: v.produto_id, litros: v.quantidade_litros });
  }
  const vendas = Array.from(litrosPorCombo.values())
    .map((v) => ({ ...v, litros: Math.round(v.litros) }))
    .filter((v) => v.litros > 0);

  if (vendas.length === 0) throw new HttpError(400, "Nenhuma venda válida para importar.");

  const { data: fechamento, error: errFechamento } = await db
    .from("fechamentos")
    .insert({
      data: body.data,
      arquivo_nome: body.arquivo_nome ?? null,
      total_linhas: body.total_linhas ?? vendas.length,
      linhas_reconhecidas: body.linhas_reconhecidas ?? vendas.length,
    })
    .select()
    .single();

  if (errFechamento) throw dbError(errFechamento);

  const { error: errVendas } = await db.from("fechamento_vendas").insert(
    vendas.map((v) => ({
      fechamento_id: fechamento.id,
      cliente_id: v.cliente_id,
      produto_id: v.produto_id,
      quantidade_litros: v.litros,
      quantidade_barris: Math.round(v.litros / (volumePorProduto.get(v.produto_id) || 1)),
    }))
  );

  if (errVendas) {
    // Não deixa um fechamento vazio no histórico se as vendas falharem
    await db.from("fechamentos").delete().eq("id", fechamento.id);
    throw dbError(errVendas, { foreignKey: "Algum cliente ou produto do arquivo não está mais cadastrado." });
  }

  const resumo = await calcularResumoFechamento(fechamento as Fechamento);
  return json({ resumo }, 201);
});
