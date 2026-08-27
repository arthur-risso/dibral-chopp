/**
 * Parser do relatório de pedidos do Promax (export bruto, ; como
 * separador, codificação Windows-1252/Latin-1). O chopp aparece
 * nesse relatório vendido por litro (coluna "Unid. Venda" = "L"),
 * então a conversão para barris é feita depois, usando o volume de
 * cada produto (30L, 50L etc.).
 */

export type LinhaPromax = {
  codigoPdv: string;
  nomePdv: string;
  codigoProduto: string;
  quantidade: number;
  unidadeVenda: string;
  dataPedidoISO: string | null;
  situacao: string;
  statusPedido: string;
};

const COLUNAS_NECESSARIAS = [
  "Cod. PDV",
  "Nome PDV",
  "Produto",
  "Quantidade",
  "Unid. Venda",
  "Data Pedido",
  "Situação",
  "Status Pedido",
] as const;

function dataParaISO(dataBr: string): string | null {
  const m = dataBr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  return `${ano}-${mes}-${dia}`;
}

export function parsePromaxCsv(texto: string): {
  linhas: LinhaPromax[];
  totalLinhas: number;
} {
  // remove BOM se houver e normaliza quebras de linha
  const limpo = texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const todasLinhas = limpo.split("\n").filter((l) => l.trim().length > 0);
  if (todasLinhas.length === 0) return { linhas: [], totalLinhas: 0 };

  const cabecalho = todasLinhas[0].split(";").map((c) => c.trim());
  const indices: Record<string, number> = {};
  for (const nome of COLUNAS_NECESSARIAS) {
    const idx = cabecalho.indexOf(nome);
    indices[nome] = idx; // pode ser -1 se a coluna não existir nesse export
  }

  const linhasDados = todasLinhas.slice(1);
  const linhas: LinhaPromax[] = [];

  for (const linhaTexto of linhasDados) {
    const campos = linhaTexto.split(";");
    const pegar = (coluna: (typeof COLUNAS_NECESSARIAS)[number]) => {
      const idx = indices[coluna];
      if (idx < 0 || idx >= campos.length) return "";
      return campos[idx].trim();
    };

    const quantidadeTexto = pegar("Quantidade").replace(",", ".");
    const quantidade = Number(quantidadeTexto);

    linhas.push({
      codigoPdv: pegar("Cod. PDV"),
      nomePdv: pegar("Nome PDV"),
      codigoProduto: pegar("Produto"),
      quantidade: Number.isFinite(quantidade) ? quantidade : 0,
      unidadeVenda: pegar("Unid. Venda"),
      dataPedidoISO: dataParaISO(pegar("Data Pedido")),
      situacao: pegar("Situação"),
      statusPedido: pegar("Status Pedido"),
    });
  }

  return { linhas, totalLinhas: linhas.length };
}
