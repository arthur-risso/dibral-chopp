import type { LinhaPromax } from "./promaxParser";

export type VendaAgregada = {
  cliente_id: string;
  produto_id: string;
  quantidade_litros: number;
};

export type ResultadoAgregacao = {
  vendas: VendaAgregada[];
  totalLinhas: number;
  reconhecidas: number;
  dataDetectada: string | null;
};

// Status Pedido precisa ser "Normal" (não cancelado). A "Situação" não é
// mais usada como filtro — conta como venda de qualquer forma.
const STATUS_VALIDOS = new Set(["Normal"]);

/**
 * Casa as linhas do relatório do Promax com os produtos (por
 * codigo_promax) e clientes (por código principal/secundário)
 * cadastrados, e soma os litros por combinação cliente+produto.
 * Roda tanto no navegador (para reduzir o que precisa ser enviado
 * ao servidor) quanto, se necessário, no servidor.
 */
export function agregarVendasPromax(
  linhas: LinhaPromax[],
  produtos: { id: string; codigo_promax: string | null }[],
  clientes: { id: string; codigo_principal: string; codigo_secundario: string | null }[]
): ResultadoAgregacao {
  const produtoPorCodigo = new Map<string, string>();
  for (const p of produtos) {
    if (p.codigo_promax) produtoPorCodigo.set(p.codigo_promax, p.id);
  }

  const clientePorCodigo = new Map<string, string>();
  for (const c of clientes) {
    clientePorCodigo.set(c.codigo_principal, c.id);
    if (c.codigo_secundario) clientePorCodigo.set(c.codigo_secundario, c.id);
  }

  const agregados = new Map<string, VendaAgregada>();
  let reconhecidas = 0;
  let dataDetectada: string | null = null;

  for (const linha of linhas) {
    if (linha.unidadeVenda !== "L") continue;
    if (!STATUS_VALIDOS.has(linha.statusPedido)) continue;

    const produtoId = produtoPorCodigo.get(linha.codigoProduto);
    if (!produtoId) continue;
    const clienteId = clientePorCodigo.get(linha.codigoPdv);
    if (!clienteId) continue;

    reconhecidas++;
    if (!dataDetectada && linha.dataPedidoISO) dataDetectada = linha.dataPedidoISO;

    const key = `${clienteId}__${produtoId}`;
    const atual = agregados.get(key);
    if (atual) atual.quantidade_litros += linha.quantidade;
    else agregados.set(key, { cliente_id: clienteId, produto_id: produtoId, quantidade_litros: linha.quantidade });
  }

  return {
    vendas: Array.from(agregados.values()),
    totalLinhas: linhas.length,
    reconhecidas,
    dataDetectada,
  };
}
