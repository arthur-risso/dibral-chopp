import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parsePromaxCsv } from "@/lib/promaxParser";
import { calcularResumoFechamento } from "@/lib/fechamentoResumo";
import type { Fechamento } from "@/lib/types";

// Só contamos como venda válida linhas de chopp (litros) com pedido "Normal"
// (não cancelado). A "Situação" (ex.: Preservado Pré-Roteirização) não é
// mais usada como filtro — conta como venda de qualquer forma.
const STATUS_VALIDOS = new Set(["Normal"]);

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

export async function POST(req: Request) {
  const db = supabaseAdmin();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Envie o arquivo como upload (multipart/form-data)." }, { status: 400 });
  }

  const arquivo = form.get("arquivo");
  if (!arquivo || !(arquivo instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const buffer = await arquivo.arrayBuffer();
  let texto: string;
  try {
    texto = new TextDecoder("windows-1252").decode(buffer);
  } catch {
    texto = new TextDecoder("utf-8").decode(buffer);
  }

  const { linhas, totalLinhas } = parsePromaxCsv(texto);
  if (totalLinhas === 0) {
    return NextResponse.json({ error: "Não consegui ler nenhuma linha desse arquivo." }, { status: 400 });
  }

  const [{ data: produtos }, { data: clientes }] = await Promise.all([
    db.from("produtos").select("id, volume_litros, codigo_promax"),
    db.from("clientes").select("id, codigo_principal, codigo_secundario"),
  ]);

  const produtoPorCodigo = new Map<string, { id: string; volume_litros: number }>();
  for (const p of produtos || []) {
    if (p.codigo_promax) produtoPorCodigo.set(p.codigo_promax, { id: p.id, volume_litros: p.volume_litros });
  }

  const clientePorCodigo = new Map<string, string>();
  for (const c of clientes || []) {
    clientePorCodigo.set(c.codigo_principal, c.id);
    if (c.codigo_secundario) clientePorCodigo.set(c.codigo_secundario, c.id);
  }

  const agregados = new Map<string, { cliente_id: string; produto_id: string; quantidade_litros: number }>();
  let reconhecidas = 0;
  let dataDetectada: string | null = null;

  for (const linha of linhas) {
    if (linha.unidadeVenda !== "L") continue;
    if (!STATUS_VALIDOS.has(linha.statusPedido)) continue;

    const produto = produtoPorCodigo.get(linha.codigoProduto);
    if (!produto) continue;
    const clienteId = clientePorCodigo.get(linha.codigoPdv);
    if (!clienteId) continue;

    reconhecidas++;
    if (!dataDetectada && linha.dataPedidoISO) dataDetectada = linha.dataPedidoISO;

    const key = `${clienteId}__${produto.id}`;
    const atual = agregados.get(key);
    if (atual) {
      atual.quantidade_litros += linha.quantidade;
    } else {
      agregados.set(key, { cliente_id: clienteId, produto_id: produto.id, quantidade_litros: linha.quantidade });
    }
  }

  if (!dataDetectada) {
    return NextResponse.json(
      { error: "Não encontrei nenhuma linha de chopp reconhecida (cliente e produto cadastrados) nesse arquivo." },
      { status: 400 }
    );
  }

  const { data: fechamento, error: errFechamento } = await db
    .from("fechamentos")
    .insert({
      data: dataDetectada,
      arquivo_nome: arquivo.name,
      total_linhas: totalLinhas,
      linhas_reconhecidas: reconhecidas,
    })
    .select()
    .single();

  if (errFechamento) return NextResponse.json({ error: errFechamento.message }, { status: 500 });

  const volumePorProduto = new Map((produtos || []).map((p) => [p.id, p.volume_litros]));
  const vendasParaInserir = Array.from(agregados.values()).map((v) => {
    const volume = volumePorProduto.get(v.produto_id) || 1;
    return {
      fechamento_id: fechamento.id,
      cliente_id: v.cliente_id,
      produto_id: v.produto_id,
      quantidade_litros: v.quantidade_litros,
      quantidade_barris: Math.round(v.quantidade_litros / volume),
    };
  });

  if (vendasParaInserir.length > 0) {
    const { error: errVendas } = await db.from("fechamento_vendas").insert(vendasParaInserir);
    if (errVendas) return NextResponse.json({ error: errVendas.message }, { status: 500 });
  }

  const resumo = await calcularResumoFechamento(db, fechamento as Fechamento);
  return NextResponse.json({ resumo }, { status: 201 });
}
